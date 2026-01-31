import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { getAuthContext } from "../auth";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract a text snippet around the first occurrence of a search term
 * Returns the snippet with the match position for highlighting
 */
function extractSnippet(
  text: string | undefined,
  searchTerm: string,
  contextLength = 80,
): { snippet: string; matchStart: number; matchEnd: number } | null {
  if (!text) return null;

  const lowerText = text.toLowerCase();
  const lowerTerm = searchTerm.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerTerm);

  if (matchIndex === -1) return null;

  // Calculate snippet boundaries
  const start = Math.max(0, matchIndex - contextLength);
  const end = Math.min(
    text.length,
    matchIndex + searchTerm.length + contextLength,
  );

  // Extract snippet and adjust match position
  let snippet = text.slice(start, end);
  const matchStart = matchIndex - start;
  const matchEnd = matchStart + searchTerm.length;

  // Add ellipsis if truncated
  if (start > 0) {
    snippet = "..." + snippet;
  }
  if (end < text.length) {
    snippet = snippet + "...";
  }

  return {
    snippet,
    matchStart: start > 0 ? matchStart + 3 : matchStart, // Account for "..."
    matchEnd: start > 0 ? matchEnd + 3 : matchEnd,
  };
}

/**
 * Format search result with snippet
 */
function formatSearchResult(
  doc: Doc<"documents">,
  matchType: "content" | "filename",
  searchTerm: string,
) {
  const snippetData =
    matchType === "content"
      ? extractSnippet(doc.extractedText, searchTerm)
      : null;

  return {
    _id: doc._id,
    filename: doc.filename,
    contentType: doc.contentType,
    size: doc.size,
    cdnUrl: doc.cdnUrl,
    blobId: doc.blobId,
    libraryId: doc.libraryId,
    matchType,
    snippet: snippetData?.snippet ?? null,
    snippetMatchStart: snippetData?.matchStart ?? null,
    snippetMatchEnd: snippetData?.matchEnd ?? null,
  };
}

/**
 * Core search logic shared between authenticated and public queries
 * @param activeLibraryIds - If provided, only return documents from these libraries (for public search filtering)
 */
async function performSearch(
  ctx: { db: { query: (table: "documents") => any } },
  siteId: Id<"sites">,
  searchTerm: string,
  limit: number,
  activeLibraryIds?: string[],
) {
  // 1. Search by content (full-text search)
  const contentResults = await ctx.db
    .query("documents")
    .withSearchIndex("search_content", (q: any) =>
      q.search("extractedText", searchTerm).eq("siteId", siteId),
    )
    .take(limit * 2); // Fetch more to account for filtering

  // 2. Search by filename (using search index for better performance)
  const filenameResults = await ctx.db
    .query("documents")
    .withSearchIndex("search_filename", (q: any) =>
      q.search("filename", searchTerm).eq("siteId", siteId),
    )
    .take(limit * 2);

  // 3. Merge and deduplicate, prioritizing content matches
  const seen = new Set<string>();
  const combined: ReturnType<typeof formatSearchResult>[] = [];

  // Helper to check if document should be included
  const shouldInclude = (doc: Doc<"documents">) => {
    // If no active library filter, include all
    if (!activeLibraryIds) return true;
    // If document has no library, exclude (orphaned)
    if (!doc.libraryId) return false;
    // Include only if library is active
    return activeLibraryIds.includes(doc.libraryId);
  };

  // Content matches first (higher relevance)
  for (const doc of contentResults) {
    if (!seen.has(doc._id) && shouldInclude(doc)) {
      seen.add(doc._id);
      combined.push(formatSearchResult(doc, "content", searchTerm));
    }
  }

  // Then filename matches
  for (const doc of filenameResults) {
    if (!seen.has(doc._id) && shouldInclude(doc)) {
      seen.add(doc._id);
      combined.push(formatSearchResult(doc, "filename", searchTerm));
    }
  }

  return combined.slice(0, limit);
}

// ============================================================================
// Queries
// ============================================================================

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

// Search documents by extracted text and filename (authenticated)
export const search = query({
  args: {
    siteId: v.id("sites"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { siteId, query: searchQuery, limit = 20 }) => {
    // Verify authentication and authorization
    const auth = await getAuthContext(ctx);

    const site = await ctx.db.get(siteId);
    if (!site) return [];

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    const trimmed = searchQuery.trim();
    if (!trimmed) return [];

    return performSearch(ctx, siteId, trimmed, limit);
  },
});

// Search documents for public site viewing
// Only returns documents from libraries that are actively used in blocks
export const searchPublic = query({
  args: {
    siteId: v.id("sites"),
    query: v.string(),
    accessToken: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { siteId, query: searchQuery, accessToken, limit = 20 },
  ) => {
    const trimmed = searchQuery.trim();
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

    // Get active library IDs (libraries that are used in blocks on pages)
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    const activeLibraryIds = new Set<string>();
    for (const page of pages) {
      const layouts = await ctx.db
        .query("layouts")
        .withIndex("by_page", (q) => q.eq("pageId", page._id))
        .collect();

      for (const layout of layouts) {
        for (const slot of layout.slots) {
          for (const block of slot.blocks) {
            if (block.type === "library" && block.content?.libraryId) {
              activeLibraryIds.add(block.content.libraryId);
            }
          }
        }
      }
    }

    // Use shared search logic with active library filter
    return performSearch(
      ctx,
      siteId,
      trimmed,
      limit,
      Array.from(activeLibraryIds),
    );
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

// Get extraction statistics for a site (authenticated)
export const getExtractionStats = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const auth = await getAuthContext(ctx);

    const site = await ctx.db.get(siteId);
    if (!site) return null;

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    // Get all documents for the site
    const allDocs = await ctx.db
      .query("documents")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    // Count by status
    const stats = {
      total: allDocs.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      unsupported: 0,
    };

    for (const doc of allDocs) {
      const status = doc.extractionStatus || "pending";
      if (status in stats) {
        stats[status as keyof typeof stats]++;
      }
    }

    return stats;
  },
});

// List documents with failed extraction (authenticated)
export const listFailedExtraction = query({
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

    return await ctx.db
      .query("documents")
      .withIndex("by_extraction_status", (q) =>
        q.eq("siteId", siteId).eq("extractionStatus", "failed"),
      )
      .take(limit);
  },
});

// Search documents within a specific library (authenticated)
export const searchByLibrary = query({
  args: {
    libraryId: v.id("documentLibraries"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { libraryId, query: searchQuery, limit = 20 }) => {
    const auth = await getAuthContext(ctx);

    // Verify authorization
    const library = await ctx.db.get(libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site) return [];

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    const trimmed = searchQuery.trim();
    if (!trimmed) return [];

    // Search by content
    const contentResults = await ctx.db
      .query("documents")
      .withSearchIndex("search_content", (q: any) =>
        q.search("extractedText", trimmed).eq("siteId", site._id),
      )
      .take(limit * 2);

    // Search by filename
    const filenameResults = await ctx.db
      .query("documents")
      .withSearchIndex("search_filename", (q: any) =>
        q.search("filename", trimmed).eq("siteId", site._id),
      )
      .take(limit * 2);

    // Merge and filter by library
    const seen = new Set<string>();
    const combined: ReturnType<typeof formatSearchResult>[] = [];

    for (const doc of contentResults) {
      if (!seen.has(doc._id) && doc.libraryId === libraryId) {
        seen.add(doc._id);
        combined.push(formatSearchResult(doc, "content", trimmed));
      }
    }

    for (const doc of filenameResults) {
      if (!seen.has(doc._id) && doc.libraryId === libraryId) {
        seen.add(doc._id);
        combined.push(formatSearchResult(doc, "filename", trimmed));
      }
    }

    return combined.slice(0, limit);
  },
});
