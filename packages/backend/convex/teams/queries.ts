import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";
import { getAuthContextOrNull } from "../auth";

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

export const getBySlugForMember = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) return null;

    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!team) return null;

    const membership = await ctx.db
      .query("members")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", team._id).eq("userId", auth.userId),
      )
      .first();
    if (!membership) return null;

    return {
      ...team,
      memberRole: membership.role,
      joinedAt: membership.joinedAt,
    };
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

    if (memberships.length === 0) return [];

    memberships.sort((a, b) => b.joinedAt - a.joinedAt);

    const teams = await Promise.all(
      memberships.map(async (m) => {
        const team = await ctx.db.get(m.teamId);
        if (!team) return null;
        return { ...team, memberRole: m.role, joinedAt: m.joinedAt };
      }),
    );

    return teams.filter((t): t is NonNullable<typeof t> => t !== null);
  },
});

export const getActiveWorkspace = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) return null;

    const memberships = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId))
      .collect();

    if (memberships.length === 0) return null;

    memberships.sort((a, b) => b.joinedAt - a.joinedAt);

    const identity = await ctx.auth.getUserIdentity();
    let activeOrganizationId: string | null = null;

    if (identity?.sessionId) {
      const session = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "session",
        where: [
          {
            field: "_id",
            value: identity.sessionId as string,
          },
          {
            field: "expiresAt",
            operator: "gt",
            value: Date.now(),
          },
        ],
      })) as { activeOrganizationId?: string | null } | null;

      activeOrganizationId = session?.activeOrganizationId ?? null;
    }

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

    const availableTeams = teams.filter(
      (team): team is NonNullable<typeof team> => team !== null,
    );

    if (availableTeams.length === 0) {
      return null;
    }

    const activeTeam =
      availableTeams.find(
        (team) => team.organizationId === activeOrganizationId,
      ) ?? availableTeams[0];

    if (!activeTeam) {
      return null;
    }

    return {
      _id: activeTeam._id,
      name: activeTeam.name,
      slug: activeTeam.slug,
      organizationId: activeTeam.organizationId,
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
