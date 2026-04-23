import { teamRoles } from "@baseblocks/types";
import { v } from "convex/values";
import { components } from "../_generated/api";
import {
  type MutationCtx,
  internalMutation,
  mutation,
} from "../_generated/server";
import { getAuthContext, requireAdmin } from "../auth";

type BetterAuthMemberRecord = {
  _id: string;
  organizationId: string;
  role?: string | null;
  userId: string;
};

type LocalMemberRecord = {
  _id: string;
  email: string;
  joinedAt: number;
  role: string;
  userId?: string;
};

async function listBetterAuthMembersByOrganization(
  ctx: MutationCtx,
  organizationId: string,
): Promise<BetterAuthMemberRecord[]> {
  const records: BetterAuthMemberRecord[] = [];
  let cursor: string | null = null;

  while (true) {
    const page = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "member",
      where: [
        { field: "organizationId", operator: "eq", value: organizationId },
      ],
      paginationOpts: { numItems: 100, cursor },
    })) as {
      continueCursor: string;
      isDone: boolean;
      page: BetterAuthMemberRecord[];
    };

    for (const record of page.page) {
      records.push(record as unknown as BetterAuthMemberRecord);
    }

    if (page.isDone) {
      return records;
    }

    cursor = page.continueCursor;
  }
}

async function removeBetterAuthMembership(
  ctx: MutationCtx,
  organizationId: string,
  userId: string,
) {
  const matchingMembers = (await ctx.runQuery(
    components.betterAuth.adapter.findMany,
    {
      model: "member",
      where: [
        { field: "organizationId", operator: "eq", value: organizationId },
        { field: "userId", operator: "eq", value: userId },
      ],
      paginationOpts: { numItems: 10, cursor: null },
    },
  )) as {
    page: BetterAuthMemberRecord[];
  };

  const betterAuthMembers = matchingMembers.page as BetterAuthMemberRecord[];
  const ownerCount = betterAuthMembers.filter(
    (member) => member.role === "owner",
  ).length;
  if (ownerCount > 0) {
    const allOrgMembers = await listBetterAuthMembersByOrganization(
      ctx,
      organizationId,
    );
    const allOwnerCount = allOrgMembers.filter(
      (member) => member.role === "owner",
    ).length;

    if (allOwnerCount <= ownerCount) {
      throw new Error(
        "Cannot remove the last Better Auth organization owner. Transfer ownership first.",
      );
    }
  }

  for (const member of betterAuthMembers) {
    await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
      input: {
        model: "member",
        where: [{ field: "_id", operator: "eq", value: member._id }],
      },
    });
  }

  await ctx.runMutation(components.betterAuth.adapter.updateMany, {
    input: {
      model: "session",
      where: [
        { field: "userId", operator: "eq", value: userId },
        {
          field: "activeOrganizationId",
          operator: "eq",
          value: organizationId,
        },
      ],
      update: {
        activeOrganizationId: null,
      },
    },
    paginationOpts: { numItems: 100, cursor: null },
  });

  return {
    deletedCount: betterAuthMembers.length,
    deletedUserId: userId,
  };
}

async function promoteLocalAdminToBetterAuthOwner(
  ctx: MutationCtx,
  organizationId: string,
  localMembers: LocalMemberRecord[],
  betterAuthMembers: BetterAuthMemberRecord[],
  dryRun: boolean,
) {
  const betterAuthUserIds = new Set(
    betterAuthMembers.map((member) => member.userId),
  );
  const candidate = [...localMembers]
    .filter(
      (member) =>
        member.role === "admin" &&
        typeof member.userId === "string" &&
        !betterAuthUserIds.has(member.userId),
    )
    .sort((a, b) => a.joinedAt - b.joinedAt)[0];

  if (!candidate?.userId) {
    return null;
  }

  if (!dryRun) {
    await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "member",
        data: {
          createdAt: Date.now(),
          organizationId,
          role: "owner",
          userId: candidate.userId,
        },
      },
    });
  }

  return candidate.userId;
}

async function repairOrganizationMembershipsForTeam(
  ctx: MutationCtx,
  teamId: string,
  dryRun: boolean,
) {
  const team = await ctx.db.get(teamId as never);
  if (!team) {
    throw new Error(`Team not found: ${teamId}`);
  }

  if (!team.organizationId) {
    throw new Error("This team is not linked to a Better Auth organization");
  }

  const localMembers = (await ctx.db
    .query("members")
    .withIndex("by_team", (q) => q.eq("teamId", team._id))
    .collect()) as LocalMemberRecord[];

  const localUserIds = new Set(
    localMembers
      .map((member) => member.userId)
      .filter((userId): userId is string => typeof userId === "string"),
  );

  const betterAuthMembers = await listBetterAuthMembersByOrganization(
    ctx,
    team.organizationId,
  );

  const staleMembers = betterAuthMembers.filter(
    (member) => !localUserIds.has(member.userId),
  );
  const staleOwnerUserIds = staleMembers
    .filter((member) => member.role === "owner")
    .map((member) => member.userId);
  const protectedOwnerUserIds = [...staleOwnerUserIds];
  let promotedOwnerUserId: string | null = null;

  if (staleOwnerUserIds.length > 0) {
    const allOwnerUserIds = betterAuthMembers
      .filter((member) => member.role === "owner")
      .map((member) => member.userId);
    const hasNonStaleOwner = allOwnerUserIds.some(
      (userId) => !staleOwnerUserIds.includes(userId),
    );

    if (!hasNonStaleOwner) {
      promotedOwnerUserId = await promoteLocalAdminToBetterAuthOwner(
        ctx,
        team.organizationId,
        localMembers,
        betterAuthMembers,
        dryRun,
      );
    }
  }

  const removableStaleMembers = staleMembers.filter(
    (member) => member.role !== "owner" || promotedOwnerUserId !== null,
  );
  const unresolvedProtectedOwnerUserIds =
    promotedOwnerUserId === null ? protectedOwnerUserIds : [];

  if (!dryRun) {
    for (const member of removableStaleMembers) {
      await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
        input: {
          model: "member",
          where: [{ field: "_id", operator: "eq", value: member._id }],
        },
      });
    }

    const removableUserIds = [
      ...new Set(removableStaleMembers.map((member) => member.userId)),
    ];
    for (const userId of removableUserIds) {
      await ctx.runMutation(components.betterAuth.adapter.updateMany, {
        input: {
          model: "session",
          where: [
            { field: "userId", operator: "eq", value: userId },
            {
              field: "activeOrganizationId",
              operator: "eq",
              value: team.organizationId,
            },
          ],
          update: {
            activeOrganizationId: null,
          },
        },
        paginationOpts: { numItems: 100, cursor: null },
      });
    }
  }

  return {
    dryRun,
    localMemberCount: localMembers.length,
    betterAuthMemberCount: betterAuthMembers.length,
    organizationId: team.organizationId,
    promotedOwnerUserId,
    protectedOwnerUserIds: unresolvedProtectedOwnerUserIds,
    removedMemberUserIds: dryRun
      ? []
      : [...new Set(removableStaleMembers.map((member) => member.userId))],
    staleMemberUserIds: [
      ...new Set(staleMembers.map((member) => member.userId)),
    ],
    teamId: team._id,
    teamSlug: team.slug,
  };
}

export const updateRole = mutation({
  args: {
    memberId: v.id("members"),
    role: v.union(...teamRoles.map((role) => v.literal(role))),
  },
  handler: async (ctx, { memberId, role }) => {
    const memberToUpdate = await ctx.db.get(memberId);
    if (!memberToUpdate) {
      throw new Error("Member not found");
    }

    await requireAdmin(ctx, memberToUpdate.teamId);

    const auth = await getAuthContext(ctx);
    if (memberToUpdate.userId === auth.userId && role !== "admin") {
      const admins = await ctx.db
        .query("members")
        .withIndex("by_team", (q) => q.eq("teamId", memberToUpdate.teamId))
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();

      if (admins.length <= 1) {
        throw new Error("Cannot remove the last admin");
      }
    }

    await ctx.db.patch(memberId, { role });
    return { success: true };
  },
});

export const deleteMyAccountData = mutation({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuthContext(ctx);

    const memberRecords = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId))
      .collect();

    for (const member of memberRecords) {
      if (member.role === "admin") {
        const admins = await ctx.db
          .query("members")
          .withIndex("by_team", (q) => q.eq("teamId", member.teamId))
          .filter((q) => q.eq(q.field("role"), "admin"))
          .collect();

        if (admins.length <= 1) {
          throw new Error(
            "Cannot delete account: you are the last admin of a team. Transfer admin role first.",
          );
        }
      }
    }

    for (const member of memberRecords) {
      await ctx.db.delete(member._id);
    }

    return { success: true, deletedMemberRecords: memberRecords.length };
  },
});

export const ensureCreatorMember = mutation({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, { teamId }) => {
    const auth = await getAuthContext(ctx);

    const team = await ctx.db.get(teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    if (team.createdBy !== auth.userId) {
      throw new Error("Only the team creator can use this operation");
    }

    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", teamId).eq("userId", auth.userId),
      )
      .first();

    if (existingMember) {
      return { memberId: existingMember._id, alreadyExists: true };
    }

    const now = Date.now();
    const memberId = await ctx.db.insert("members", {
      teamId,
      userId: auth.userId,
      email: auth.email || "",
      name: auth.name,
      imageUrl: auth.imageUrl,
      role: "admin",
      joinedAt: now,
    });

    return { memberId, alreadyExists: false };
  },
});

export const syncMemberFromInvitation = mutation({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, { organizationId }) => {
    const auth = await getAuthContext(ctx);

    const baMembers = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        where: [
          { field: "organizationId", operator: "eq", value: organizationId },
          { field: "userId", operator: "eq", value: auth.userId },
        ],
        limit: 1,
        paginationOpts: { numItems: 1, cursor: null },
      },
    );

    if (
      !baMembers ||
      !("page" in baMembers) ||
      (baMembers as { page: unknown[] }).page.length === 0
    ) {
      throw new Error(
        "No membership found. Accept the invitation before syncing.",
      );
    }

    const baMemberRecord = (baMembers as { page: Record<string, unknown>[] })
      .page[0]!;
    const baRole = (baMemberRecord.role as string) || "member";

    const team = await ctx.db
      .query("teams")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId),
      )
      .first();

    if (!team) {
      throw new Error("Team not found for this organization");
    }

    const existing = await ctx.db
      .query("members")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", team._id).eq("userId", auth.userId),
      )
      .first();

    if (existing) {
      return { memberId: existing._id, alreadyExists: true };
    }

    const convexRole = baRole === "admin" ? "admin" : "editor";

    const memberId = await ctx.db.insert("members", {
      teamId: team._id,
      userId: auth.userId,
      email: auth.email || "",
      name: auth.name,
      imageUrl: auth.imageUrl,
      role: convexRole,
      joinedAt: Date.now(),
    });

    return { memberId, alreadyExists: false };
  },
});

export const removeMember = mutation({
  args: {
    teamId: v.id("teams"),
    memberId: v.id("members"),
  },
  handler: async (ctx, { teamId, memberId }) => {
    // Failure modes:
    // - Member no longer exists
    // - Member belongs to a different team
    // - Admin attempts to remove themselves
    // - Better Auth membership is the last remaining organization owner
    const { auth } = await requireAdmin(ctx, teamId);

    const memberToRemove = await ctx.db.get(memberId);
    if (!memberToRemove) {
      throw new Error("Member not found");
    }

    if (memberToRemove.teamId !== teamId) {
      throw new Error("Member does not belong to this team");
    }

    if (memberToRemove.userId === auth.userId) {
      throw new Error("Cannot remove yourself from the organization");
    }

    const team = await ctx.db.get(teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    if (team.organizationId && memberToRemove.userId) {
      await removeBetterAuthMembership(
        ctx,
        team.organizationId,
        memberToRemove.userId,
      );
    }

    await ctx.db.delete(memberId);
    return { success: true, removedUserId: memberToRemove.userId };
  },
});

export const repairOrganizationMemberships = mutation({
  args: {
    teamId: v.id("teams"),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { teamId, dryRun }) => {
    const normalizedDryRun = dryRun ?? true;
    await requireAdmin(ctx, teamId);
    return await repairOrganizationMembershipsForTeam(
      ctx,
      teamId,
      normalizedDryRun,
    );
  },
});

export const repairAllOrganizationMembershipsInternal = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { dryRun }) => {
    const normalizedDryRun = dryRun ?? true;
    const teams = await ctx.db.query("teams").collect();
    const orgBackedTeams = teams.filter(
      (team) =>
        typeof team.organizationId === "string" &&
        team.organizationId.length > 0,
    );

    const repairedTeams = [];
    for (const team of orgBackedTeams) {
      repairedTeams.push(
        await repairOrganizationMembershipsForTeam(
          ctx,
          team._id,
          normalizedDryRun,
        ),
      );
    }

    return {
      dryRun: normalizedDryRun,
      repairedTeamCount: repairedTeams.length,
      repairedTeams,
    };
  },
});
