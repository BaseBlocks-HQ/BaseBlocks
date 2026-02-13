import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthContextOrNull } from "../auth";

// Get company by slug (for multi-tenant routing)
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("companies")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
  },
});

// Get current user's company (based on membership)
export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) return null;

    // Find any company where the user is a member
    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId))
      .first();

    if (!member) return null;

    return await ctx.db.get(member.companyId);
  },
});

// Check if slug is available
export const isSlugAvailable = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const existing = await ctx.db
      .query("companies")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    return !existing;
  },
});
