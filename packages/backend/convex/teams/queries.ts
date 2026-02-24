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
  args: {},
  handler: async (ctx) => {
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) return null;

    // Find any team where the user is a member
    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId))
      .first();

    if (!member) return null;

    return await ctx.db.get(member.teamId);
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
