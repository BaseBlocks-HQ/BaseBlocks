import { v } from "convex/values";
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
