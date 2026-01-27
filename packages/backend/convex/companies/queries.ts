import { v } from "convex/values";
import { query } from "../_generated/server";
import { getOptionalAuthContext } from "../auth";

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

// Get company by Entity Auth org ID
export const getByEaOrgId = query({
  args: { eaOrgId: v.string() },
  handler: async (ctx, { eaOrgId }) => {
    return await ctx.db
      .query("companies")
      .withIndex("by_eaOrgId", (q) => q.eq("eaOrgId", eaOrgId))
      .first();
  },
});

// Get current user's company (based on their active org or userId)
export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getOptionalAuthContext(ctx);
    if (!auth) return null;

    // Try org ID first, then fallback to user ID
    const eaOrgId = auth.eaOrgId || auth.userId;
    if (!eaOrgId) return null;

    return await ctx.db
      .query("companies")
      .withIndex("by_eaOrgId", (q) => q.eq("eaOrgId", eaOrgId))
      .first();
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
