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

// Search documents by extracted text and filename
export const search = query({
  args: {
    siteId: v.id("sites"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { siteId, query: searchQuery, limit = 20 }) => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return [];

    // 1. Search by content (full-text search)
    const contentResults = await ctx.db
      .query("documents")
      .withSearchIndex("search_content", (q) =>
        q.search("extractedText", trimmed).eq("siteId", siteId),
      )
      .take(limit);

    // 2. Search by filename (filter all site documents)
    const allDocs = await ctx.db
      .query("documents")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    const filenameResults = allDocs.filter((doc) =>
      doc.filename.toLowerCase().includes(trimmed)
    );

    // 3. Merge and deduplicate, prioritizing content matches
    const seen = new Set<string>();
    const combined = [];

    // Content matches first (higher relevance)
    for (const doc of contentResults) {
      if (!seen.has(doc._id)) {
        seen.add(doc._id);
        combined.push({ ...doc, matchType: "content" as const });
      }
    }

    // Then filename matches
    for (const doc of filenameResults) {
      if (!seen.has(doc._id)) {
        seen.add(doc._id);
        combined.push({ ...doc, matchType: "filename" as const });
      }
    }

    return combined.slice(0, limit);
  },
});

// Search documents for public site viewing
export const searchPublic = query({
  args: {
    siteId: v.id("sites"),
    query: v.string(),
    accessToken: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { siteId, query: searchQuery, accessToken, limit = 20 }) => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return [];

    // Check site is published
    const site = await ctx.db.get(siteId);
    if (!site || !site.isPublished) return [];

    // Verify access token if provided
    if (accessToken) {
      const link = await ctx.db
        .query("accessLinks")
        .withIndex("by_token", (q) => q.eq("token", accessToken))
        .first();

      if (!link || link.siteId !== siteId) {
        return [];
      }

      if (link.expiresAt && link.expiresAt < Date.now()) {
        return [];
      }

      if (link.maxUses && link.useCount >= link.maxUses) {
        return [];
      }
    }

    // 1. Search by content (full-text search)
    const contentResults = await ctx.db
      .query("documents")
      .withSearchIndex("search_content", (q) =>
        q.search("extractedText", trimmed).eq("siteId", siteId),
      )
      .take(limit);

    // 2. Search by filename
    const allDocs = await ctx.db
      .query("documents")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    const filenameResults = allDocs.filter((doc) =>
      doc.filename.toLowerCase().includes(trimmed)
    );

    // 3. Merge and deduplicate
    const seen = new Set<string>();
    const combined = [];

    for (const doc of contentResults) {
      if (!seen.has(doc._id)) {
        seen.add(doc._id);
        combined.push({
          _id: doc._id,
          filename: doc.filename,
          contentType: doc.contentType,
          size: doc.size,
          cdnUrl: doc.cdnUrl,
          libraryId: doc.libraryId,
          matchType: "content" as const,
        });
      }
    }

    for (const doc of filenameResults) {
      if (!seen.has(doc._id)) {
        seen.add(doc._id);
        combined.push({
          _id: doc._id,
          filename: doc.filename,
          contentType: doc.contentType,
          size: doc.size,
          cdnUrl: doc.cdnUrl,
          libraryId: doc.libraryId,
          matchType: "filename" as const,
        });
      }
    }

    return combined.slice(0, limit);
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

// List documents in a library (authenticated)
export const listByLibrary = query({
  args: { libraryId: v.id("documentLibraries") },
  handler: async (ctx, { libraryId }) => {
    const auth = await getAuthContext(ctx);

    const library = await ctx.db.get(libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site) return [];

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("documents")
      .withIndex("by_library", (q) => q.eq("libraryId", libraryId))
      .collect();
  },
});

// List documents in a specific folder (authenticated)
export const listByFolder = query({
  args: {
    libraryId: v.id("documentLibraries"),
    folderId: v.optional(v.id("documentFolders")),
  },
  handler: async (ctx, { libraryId, folderId }) => {
    const auth = await getAuthContext(ctx);

    const library = await ctx.db.get(libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site) return [];

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("documents")
      .withIndex("by_folder", (q) =>
        q.eq("libraryId", libraryId).eq("folderId", folderId),
      )
      .collect();
  },
});

// List documents in a library for public viewing
export const listByLibraryPublic = query({
  args: {
    libraryId: v.id("documentLibraries"),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, { libraryId, accessToken }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site || !site.isPublished) return [];

    // Verify access token if provided
    if (accessToken) {
      const link = await ctx.db
        .query("accessLinks")
        .withIndex("by_token", (q) => q.eq("token", accessToken))
        .first();

      if (!link || link.siteId !== library.siteId) {
        return [];
      }

      if (link.expiresAt && link.expiresAt < Date.now()) {
        return [];
      }

      if (link.maxUses && link.useCount >= link.maxUses) {
        return [];
      }
    }

    return await ctx.db
      .query("documents")
      .withIndex("by_library", (q) => q.eq("libraryId", libraryId))
      .collect();
  },
});

// List documents in a folder for public viewing
export const listByFolderPublic = query({
  args: {
    libraryId: v.id("documentLibraries"),
    folderId: v.optional(v.id("documentFolders")),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, { libraryId, folderId, accessToken }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site || !site.isPublished) return [];

    // Verify access token if provided
    if (accessToken) {
      const link = await ctx.db
        .query("accessLinks")
        .withIndex("by_token", (q) => q.eq("token", accessToken))
        .first();

      if (!link || link.siteId !== library.siteId) {
        return [];
      }

      if (link.expiresAt && link.expiresAt < Date.now()) {
        return [];
      }

      if (link.maxUses && link.useCount >= link.maxUses) {
        return [];
      }
    }

    return await ctx.db
      .query("documents")
      .withIndex("by_folder", (q) =>
        q.eq("libraryId", libraryId).eq("folderId", folderId),
      )
      .collect();
  },
});
