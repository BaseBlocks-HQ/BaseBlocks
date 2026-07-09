// Flattened Convex domain module. Keep this file as the public API for this domain.
import { teamRoles } from "@baseblocks/domain";
import type { GenericQueryCtx } from "convex/server";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { v } from "convex/values";
import { type MutationCtx, query, mutation } from "./_generated/server";
import {
  checkIsMember,
  getAuthContext,
  getAuthContextOrNull,
  requireAdmin,
} from "./permissions";

function getWorkspaceUser(
  auth: NonNullable<Awaited<ReturnType<typeof getAuthContextOrNull>>>,
) {
  return {
    email: auth.email ?? null,
    id: auth.userId,
    imageUrl: auth.imageUrl ?? null,
    name: auth.name ?? null,
  };
}

async function getWorkspaceTeams(
  ctx: GenericQueryCtx<DataModel>,
  userId: string,
) {
  const memberships = await ctx.db
    .query("members")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  if (memberships.length === 0) {
    return [];
  }

  memberships.sort((a, b) => b.joinedAt - a.joinedAt);

  const teams = await Promise.all(
    memberships.map(async (membership) => {
      const team = await ctx.db.get(membership.teamId);
      if (!team) return null;
      return {
        ...team,
        memberRole: membership.role,
        joinedAt: membership.joinedAt,
      };
    }),
  );

  return teams.filter(
    (team): team is NonNullable<typeof team> => team !== null,
  );
}

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!team) return null;
    // Project only public fields — exclude organizationId and createdBy
    return {
      _id: team._id,
      _creationTime: team._creationTime,
      name: team.name,
      slug: team.slug,
      logoUrl: team.logoUrl,
      settings: team.settings,
    };
  },
});

export const getWorkspaceBoundary = query({
  args: {
    teamSlug: v.optional(v.string()),
  },
  handler: async (ctx, { teamSlug }) => {
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) {
      return {
        activeWorkspace: null,
        requestedWorkspace: null,
        teams: [],
        user: null,
      };
    }

    const teams = await getWorkspaceTeams(ctx, auth.userId);
    if (teams.length === 0) {
      return {
        activeWorkspace: null,
        requestedWorkspace: null,
        teams: [],
        user: getWorkspaceUser(auth),
      };
    }

    const requestedWorkspace = teamSlug
      ? (teams.find((team) => team.slug === teamSlug) ?? null)
      : null;

    const activeWorkspace = requestedWorkspace ?? teams[0] ?? null;

    return {
      activeWorkspace,
      requestedWorkspace,
      teams,
      user: getWorkspaceUser(auth),
    };
  },
});

export const isSlugAvailable = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const existing = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    return !existing;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    organizationId: v.optional(v.string()),
  },
  handler: async (ctx, { name, slug, organizationId }) => {
    const auth = await getAuthContext(ctx);

    // Check slug availability
    const existing = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (existing) {
      throw new Error(
        `The workspace URL "${slug}" is already taken. Please choose a different name.`,
      );
    }

    const now = Date.now();
    const teamId = await ctx.db.insert("teams", {
      name,
      slug: slug.toLowerCase(),
      organizationId,
      createdBy: auth.userId,
      createdAt: now,
      settings: {
        primaryColor: "#0066FF",
      },
    });

    // Create the creator as an admin member of this team
    await ctx.db.insert("members", {
      teamId,
      userId: auth.userId,
      email: auth.email ?? "",
      name: auth.name,
      imageUrl: auth.imageUrl,
      role: "admin",
      joinedAt: now,
    });

    return teamId;
  },
});

export const updateSettings = mutation({
  args: {
    teamId: v.id("teams"),
    settings: v.object({
      primaryColor: v.optional(v.string()),
      customDomain: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { teamId, settings }) => {
    await requireAdmin(ctx, teamId);

    const team = await ctx.db.get(teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    await ctx.db.patch(teamId, {
      settings: { ...team.settings, ...settings },
    });

    return teamId;
  },
});

export const updateProfile = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, { teamId, name, logoUrl }) => {
    await requireAdmin(ctx, teamId);

    const updates: Record<string, string> = {};
    if (name !== undefined) updates.name = name;
    if (logoUrl !== undefined) updates.logoUrl = logoUrl;

    await ctx.db.patch(teamId, updates);
    return teamId;
  },
});

type AuthUserProfile = {
  _id: string;
  email: string;
  image?: string | null;
  name: string;
};

export const listMembers = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, { teamId }) => {
    if (!(await checkIsMember(ctx, teamId))) return [];

    const members = await ctx.db
      .query("members")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .collect();

    const memberSnapshots = members.map((m) => ({
      _id: m._id,
      userId: m.userId,
      email: m.email,
      name: m.name,
      imageUrl: m.imageUrl,
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    if (memberSnapshots.length === 0) {
      return memberSnapshots;
    }

    const authUsersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "user",
        where: [
          {
            field: "_id",
            operator: "in",
            value: memberSnapshots.map((member) => member.userId),
          },
        ],
        paginationOpts: {
          numItems: memberSnapshots.length,
          cursor: null,
        },
      },
    );

    const authUsers: AuthUserProfile[] =
      authUsersResult && "page" in authUsersResult
        ? (authUsersResult.page as {
            _id: string;
            email: string;
            image?: string | null;
            name: string;
          }[])
        : [];

    const authUsersById = new Map(authUsers.map((user) => [user._id, user]));
    return memberSnapshots.map((member) => {
      const authUser = authUsersById.get(member.userId);
      return authUser
        ? {
            ...member,
            email: authUser.email,
            imageUrl: authUser.image ?? undefined,
            name: authUser.name,
          }
        : member;
    });
  },
});

export const getMyRole = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, { teamId }) => {
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) {
      return null;
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", teamId).eq("userId", auth.userId),
      )
      .first();

    if (!member) {
      return null;
    }

    return {
      role: member.role,
    };
  },
});

export const isAdmin = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, { teamId }) => {
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) {
      return false;
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", teamId).eq("userId", auth.userId),
      )
      .first();

    return member?.role === "admin";
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) return [];

    const memberships = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId))
      .collect();

    memberships.sort((a, b) => b.joinedAt - a.joinedAt);

    return memberships.map((membership) => ({
      _id: membership._id,
      teamId: membership.teamId,
      role: membership.role,
      joinedAt: membership.joinedAt,
    }));
  },
});

export const isMember = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, { teamId }) => {
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) {
      return false;
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", teamId).eq("userId", auth.userId),
      )
      .first();

    return !!member;
  },
});

export const countMembers = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, { teamId }) => {
    if (!(await checkIsMember(ctx, teamId))) return null;

    const members = await ctx.db
      .query("members")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .collect();

    return members.length;
  },
});

type BetterAuthMemberRecord = {
  _id: string;
  role?: string | null;
  userId: string;
};

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
  )) as { page: BetterAuthMemberRecord[] };

  for (const member of matchingMembers.page) {
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

    const role = baRole === "admin" || baRole === "owner" ? "admin" : "editor";

    const memberId = await ctx.db.insert("members", {
      teamId: team._id,
      userId: auth.userId,
      email: auth.email || "",
      name: auth.name,
      imageUrl: auth.imageUrl,
      role,
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

    if (team.organizationId) {
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
