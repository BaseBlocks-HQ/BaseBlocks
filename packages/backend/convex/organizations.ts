import { v } from "convex/values";
import { components } from "./_generated/api";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import {
  type AuthMember,
  type AuthUser,
  authPage,
  getAuthOrganizationById,
} from "./authComponent/model";
import {
  getAuthContextOrNull,
  requireUser,
  requireOrganizationPermission,
} from "./permissions";
import {
  MAX_OWNED_ORGANIZATIONS,
  classifyAccountDeletionWorkspaces,
  getPrimaryOrganizationRole,
  hasOrganizationRole,
  hasReachedOwnedOrganizationLimit,
} from "./authComponent/organizationPolicy";
import { deleteSiteData, readSiteDeletionManifest } from "./model/siteDeletion";
import {
  cleanupBillingDerivedData,
  getBillingDeletionState,
} from "./model/billingRetention";
import {
  deleteWorkspaceFoundationData,
  findProfile,
} from "./workspaceProfiles";

const componentPage = { numItems: 250, cursor: null } as const;

async function listOrganizationMembers(
  ctx: Parameters<typeof getAuthOrganizationById>[0],
  organizationId: string,
) {
  return authPage<AuthMember>(
    await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "member",
      where: [
        { field: "organizationId", operator: "eq", value: organizationId },
      ],
      paginationOpts: componentPage,
    }),
  );
}

async function deleteAllAuthRows(
  ctx: MutationCtx,
  model: "member" | "invitation" | "organization",
  field: "organizationId" | "_id",
  organizationId: string,
) {
  let deletedCount: number;
  do {
    const result: { count: number } = await ctx.runMutation(
      components.betterAuth.adapter.deleteMany,
      {
        input: {
          model,
          where: [{ field, operator: "eq", value: organizationId }],
        } as never,
        paginationOpts: componentPage,
      },
    );
    deletedCount = result.count;
  } while (deletedCount === componentPage.numItems);
}

export const getViewerState = query({
  args: { teamSlug: v.optional(v.string()) },
  handler: async (ctx, { teamSlug }) => {
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) {
      return {
        team: null,
        teams: [],
        user: null,
      };
    }

    const membershipResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        where: [{ field: "userId", operator: "eq", value: auth.userId }],
        paginationOpts: { numItems: 100, cursor: null },
      },
    );
    const memberships = authPage<AuthMember>(membershipResult).sort(
      (a, b) => b.createdAt - a.createdAt,
    );

    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const organization = await getAuthOrganizationById(
          ctx,
          membership.organizationId,
        );
        if (!organization?.slug) return null;
        const profile = await findProfile(ctx as never, organization._id);
        return {
          _id: organization._id,
          joinedAt: membership.createdAt,
          logoUrl: organization.logo ?? undefined,
          memberRole: membership.role,
          name: organization.name,
          slug: organization.slug,
          intent: profile?.intent ?? null,
          profileSource: profile?.source ?? null,
        };
      }),
    );
    const teams = organizations.filter(
      (organization): organization is NonNullable<typeof organization> =>
        organization !== null,
    );
    const team = teamSlug
      ? (teams.find((candidate) => candidate.slug === teamSlug) ?? null)
      : (teams[0] ?? null);

    return {
      team,
      teams,
      user: {
        email: auth.email ?? null,
        id: auth.userId,
        imageUrl: auth.imageUrl ?? null,
        name: auth.name ?? null,
      },
    };
  },
});

export const getAccountDeletionPlan = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireUser(ctx);
    const memberships = authPage<AuthMember>(
      await ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: "member",
        where: [{ field: "userId", operator: "eq", value: auth.userId }],
        paginationOpts: componentPage,
      }),
    );
    const ownedWorkspaces = (
      await Promise.all(
        memberships
          .filter((membership) => hasOrganizationRole(membership.role, "owner"))
          .map(async (membership) => {
            const [organization, members] = await Promise.all([
              getAuthOrganizationById(ctx, membership.organizationId),
              listOrganizationMembers(ctx, membership.organizationId),
            ]);
            if (!organization) return null;
            return {
              id: organization._id,
              name: organization.name,
              slug: organization.slug ?? null,
              memberCount: members.length,
            };
          }),
      )
    ).filter(
      (workspace): workspace is NonNullable<typeof workspace> =>
        workspace !== null,
    );
    const classification = classifyAccountDeletionWorkspaces(ownedWorkspaces);
    return {
      email: auth.email ?? null,
      ...classification,
      sharedWorkspaceCount: memberships.length - ownedWorkspaces.length,
    };
  },
});

export const deleteAccountApplicationAccess = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const guestGrants = await ctx.db
      .query("pageGuestGrants")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const grant of guestGrants) await ctx.db.delete(grant._id);
    return { deletedGuestGrantCount: guestGrants.length };
  },
});

export const listMembers = query({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) => {
    // Convex React may issue the first query before its auth token finishes
    // loading. Treat that transient state as empty instead of surfacing an
    // application error; the query reruns when the identity arrives.
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) return [];
    const viewerMembership = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          { field: "userId", operator: "eq", value: auth.userId },
          { field: "organizationId", operator: "eq", value: organizationId },
        ],
      },
    );
    // This also covers the brief render between deleting/leaving an
    // organization and the browser completing its redirect.
    if (!viewerMembership) return [];
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        where: [
          { field: "organizationId", operator: "eq", value: organizationId },
        ],
        paginationOpts: { numItems: 250, cursor: null },
      },
    );
    const members = authPage<AuthMember>(memberResult);
    if (members.length === 0) return [];

    const userResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "user",
        where: [
          {
            field: "_id",
            operator: "in",
            value: members.map((member) => member.userId),
          },
        ],
        paginationOpts: { numItems: members.length, cursor: null },
      },
    );
    const usersById = new Map(
      authPage<AuthUser>(userResult).map((user) => [user._id, user]),
    );

    return members.map((member) => {
      const user = usersById.get(member.userId);
      return {
        _id: member._id,
        userId: member.userId,
        email: user?.email ?? "",
        name: user?.name,
        imageUrl: user?.image ?? undefined,
        role: getPrimaryOrganizationRole(member.role),
        joinedAt: member.createdAt,
      };
    });
  },
});

export const getDeletionManifest = query({
  args: {
    organizationId: v.string(),
    mode: v.union(v.literal("workspace"), v.literal("account")),
  },
  handler: async (ctx, { organizationId, mode }) => {
    await requireOrganizationPermission(ctx, organizationId, {
      resource: "organization",
      action: "delete",
    });
    const organization = await getAuthOrganizationById(ctx, organizationId);
    if (!organization) return null;
    if (mode === "account") {
      const members = await listOrganizationMembers(ctx, organizationId);
      if (members.length !== 1) {
        throw new Error(
          "Transfer ownership before deleting this workspace with your account",
        );
      }
    }
    const billingDeletionState = await getBillingDeletionState(
      ctx,
      organizationId,
    );
    if (billingDeletionState.unsettledReservationCount > 0) {
      throw new Error(
        "Wait for active AI work to finish before deleting this workspace",
      );
    }
    const sites = await ctx.db
      .query("sites")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId),
      )
      .collect();
    const siteManifests = await Promise.all(
      sites.map((site) => readSiteDeletionManifest(ctx, site._id)),
    );
    const connections = await ctx.db
      .query("integrationConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId),
      )
      .collect();
    return {
      id: organization._id,
      name: organization.name,
      slug: organization.slug,
      connectionIds: connections.map((connection) => connection._id),
      hostnames: siteManifests.flatMap((manifest) => manifest.hostnames),
      objectKeys: [
        ...new Set(siteManifests.flatMap((manifest) => manifest.objectKeys)),
      ],
      siteCount: sites.length,
      siteIds: sites.map((site) => site._id),
    };
  },
});

export const deleteOwnedSite = mutation({
  args: { organizationId: v.string(), siteId: v.id("sites") },
  handler: async (ctx, { organizationId, siteId }) => {
    await requireOrganizationPermission(ctx, organizationId, {
      resource: "organization",
      action: "delete",
    });
    const site = await ctx.db.get(siteId);
    if (!site) return;
    if (site.organizationId !== organizationId) {
      throw new Error("Space does not belong to this workspace");
    }
    await deleteSiteData(ctx, siteId, { includeDomains: true });
  },
});

export const transferOwnership = mutation({
  args: {
    organizationId: v.string(),
    targetMemberId: v.string(),
  },
  handler: async (ctx, { organizationId, targetMemberId }) => {
    const { auth, member: currentMember } = await requireOrganizationPermission(
      ctx,
      organizationId,
      {
        resource: "organization",
        action: "delete",
      },
    );
    const targetMember = (await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [{ field: "_id", operator: "eq", value: targetMemberId }],
      },
    )) as AuthMember | null;
    if (
      !targetMember ||
      targetMember.organizationId !== organizationId ||
      targetMember.userId === auth.userId
    ) {
      throw new Error("Choose another member of this workspace");
    }

    const targetOwnerships = authPage<AuthMember>(
      await ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: "member",
        where: [
          { field: "userId", operator: "eq", value: targetMember.userId },
          { field: "role", operator: "contains", value: "owner" },
        ],
        paginationOpts: {
          numItems: MAX_OWNED_ORGANIZATIONS + 1,
          cursor: null,
        },
      }),
    );
    if (
      !hasOrganizationRole(targetMember.role, "owner") &&
      hasReachedOwnedOrganizationLimit(targetOwnerships)
    ) {
      throw new Error(
        `This member already owns ${MAX_OWNED_ORGANIZATIONS} workspaces`,
      );
    }

    await ctx.runMutation(components.betterAuth.adapter.updateMany, {
      input: {
        model: "member",
        update: { role: "owner" },
        where: [{ field: "_id", operator: "eq", value: targetMemberId }],
      },
      paginationOpts: componentPage,
    });
    await ctx.runMutation(components.betterAuth.adapter.updateMany, {
      input: {
        model: "member",
        update: { role: "admin" },
        where: [{ field: "_id", operator: "eq", value: currentMember.id }],
      },
      paginationOpts: componentPage,
    });
    return { organizationId, ownerMemberId: targetMemberId };
  },
});

export const deleteOwned = mutation({
  args: {
    organizationId: v.string(),
    mode: v.union(v.literal("workspace"), v.literal("account")),
  },
  handler: async (ctx, { organizationId, mode }) => {
    const { auth } = await requireOrganizationPermission(ctx, organizationId, {
      resource: "organization",
      action: "delete",
    });
    const remainingSite = await ctx.db
      .query("sites")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId),
      )
      .first();
    if (remainingSite) {
      throw new Error("Delete all spaces in this workspace before continuing");
    }
    if (mode === "account") {
      const members = await listOrganizationMembers(ctx, organizationId);
      if (members.length !== 1 || members[0]?.userId !== auth.userId) {
        throw new Error(
          "Transfer ownership before deleting this workspace with your account",
        );
      }
    }

    const connections = await ctx.db
      .query("integrationConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId),
      )
      .collect();
    for (const connection of connections) {
      const [states, resources] = await Promise.all([
        ctx.db
          .query("integrationSyncStates")
          .withIndex("by_connection_stream", (q) =>
            q.eq("connectionId", connection._id),
          )
          .collect(),
        ctx.db
          .query("integrationResources")
          .withIndex("by_connection", (q) =>
            q.eq("connectionId", connection._id),
          )
          .collect(),
      ]);
      for (const row of [...states, ...resources]) await ctx.db.delete(row._id);
      await ctx.db.delete(connection._id);
    }
    const legacyEntitlement = await ctx.db
      .query("aiOrganizationEntitlements")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId),
      )
      .unique();
    if (legacyEntitlement) await ctx.db.delete(legacyEntitlement._id);

    await cleanupBillingDerivedData(ctx, organizationId);

    await deleteWorkspaceFoundationData(ctx as never, organizationId);

    await ctx.runMutation(components.betterAuth.adapter.updateMany, {
      input: {
        model: "session",
        update: { activeOrganizationId: null },
        where: [
          {
            field: "activeOrganizationId",
            operator: "eq",
            value: organizationId,
          },
        ],
      },
      paginationOpts: componentPage,
    });
    await deleteAllAuthRows(
      ctx,
      "invitation",
      "organizationId",
      organizationId,
    );
    await deleteAllAuthRows(ctx, "member", "organizationId", organizationId);
    await deleteAllAuthRows(ctx, "organization", "_id", organizationId);

    const remainingMemberships = authPage<AuthMember>(
      await ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: "member",
        where: [{ field: "userId", operator: "eq", value: auth.userId }],
        paginationOpts: { numItems: 1, cursor: null },
      }),
    );
    const nextOrganization = remainingMemberships[0]
      ? await getAuthOrganizationById(
          ctx,
          remainingMemberships[0].organizationId,
        )
      : null;
    return { nextSlug: nextOrganization?.slug ?? null };
  },
});
