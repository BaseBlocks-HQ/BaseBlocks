import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthContextOrNull } from "../auth";

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
  },
});

export const getMine = query({
  args: {
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, { teamId }) => {
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) return null;

    if (teamId) {
      const member = await ctx.db
        .query("members")
        .withIndex("by_team_user", (q) =>
          q.eq("teamId", teamId).eq("userId", auth.userId),
        )
        .first();
      if (!member) return null;
      return await ctx.db.get(teamId);
    }

    const memberships = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId))
      .collect();

    if (memberships.length === 0) return null;

    memberships.sort((a, b) => b.joinedAt - a.joinedAt);

    return await ctx.db.get(memberships[0]!.teamId);
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

    const teams = await Promise.all(
      memberships.map(async (m) => {
        const team = await ctx.db.get(m.teamId);
        if (!team) return null;
        return { ...team, memberRole: m.role };
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
