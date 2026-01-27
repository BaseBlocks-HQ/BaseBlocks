import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthContext } from "../auth";

// List access links for a site
export const list = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const auth = await getAuthContext(ctx);

    const site = await ctx.db.get(siteId);
    if (!site) return [];

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("accessLinks")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
  },
});

// Validate access token (for public access)
export const validateToken = query({
  args: {
    token: v.string(),
    siteId: v.id("sites"),
  },
  handler: async (ctx, { token, siteId }) => {
    const link = await ctx.db
      .query("accessLinks")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!link || link.siteId !== siteId) {
      return { valid: false, reason: "Invalid token" };
    }

    // Check expiry
    if (link.expiresAt && link.expiresAt < Date.now()) {
      return { valid: false, reason: "Token expired" };
    }

    // Check max uses
    if (link.maxUses && link.useCount >= link.maxUses) {
      return { valid: false, reason: "Token usage limit reached" };
    }

    return { valid: true, link };
  },
});

// Get access log for a site
export const getAccessLog = query({
  args: {
    siteId: v.id("sites"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { siteId, limit = 50 }) => {
    const auth = await getAuthContext(ctx);

    const site = await ctx.db.get(siteId);
    if (!site) return [];

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    const logs = await ctx.db
      .query("accessLog")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .order("desc")
      .take(limit);

    return logs;
  },
});
