import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthContext } from "../auth";

// List documents for a site (authenticated)
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
      .query("documents")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
  },
});

// Get single document
export const get = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    return await ctx.db.get(documentId);
  },
});

// Search documents by extracted text
export const search = query({
  args: {
    siteId: v.id("sites"),
    query: v.string(),
  },
  handler: async (ctx, { siteId, query: searchQuery }) => {
    if (!searchQuery.trim()) return [];

    return await ctx.db
      .query("documents")
      .withSearchIndex("search_content", (q) =>
        q.search("extractedText", searchQuery).eq("siteId", siteId),
      )
      .take(20);
  },
});

// List documents for public site viewing (with access token)
export const listPublic = query({
  args: {
    siteId: v.id("sites"),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, { siteId, accessToken }) => {
    const site = await ctx.db.get(siteId);
    if (!site || !site.isPublished) return [];

    // Verify access token if site requires it
    if (accessToken) {
      const link = await ctx.db
        .query("accessLinks")
        .withIndex("by_token", (q) => q.eq("token", accessToken))
        .first();

      if (!link || link.siteId !== siteId) {
        return [];
      }

      // Check expiry
      if (link.expiresAt && link.expiresAt < Date.now()) {
        return [];
      }

      // Check max uses
      if (link.maxUses && link.useCount >= link.maxUses) {
        return [];
      }
    }

    return await ctx.db
      .query("documents")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
  },
});
