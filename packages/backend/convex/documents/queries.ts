import type { GenericQueryCtx } from "convex/server";
import { v } from "convex/values";
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { requireMember } from "../auth";
import { getActiveLibraryIds } from "../lib/resolvers";
import { canAccessPublishedSite } from "../sharing/access";
import { buildDocumentDownloadUrl } from "../storage/paths";
import { mapDocumentListing } from "./listings";

function mapDocument(doc: Doc<"documents">) {
  const downloadUrl = buildDocumentDownloadUrl(doc._id);
  return {
    ...doc,
    downloadUrl,
  };
}

async function listDocumentsForSite(
  ctx: Pick<GenericQueryCtx<DataModel>, "db">,
  siteId: Id<"sites">,
) {
  const listings = await ctx.db
    .query("documentListings")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .collect();
  return listings.map(mapDocumentListing);
}

async function listDocumentsForLibrary(
  ctx: Pick<GenericQueryCtx<DataModel>, "db">,
  libraryId: Id<"documentLibraries">,
) {
  const listings = await ctx.db
    .query("documentListings")
    .withIndex("by_library", (q) => q.eq("libraryId", libraryId))
    .collect();
  return listings.map(mapDocumentListing);
}

async function listDocumentsForFolder(
  ctx: Pick<GenericQueryCtx<DataModel>, "db">,
  libraryId: Id<"documentLibraries">,
  folderId: Id<"documentFolders"> | undefined,
) {
  const listings = await ctx.db
    .query("documentListings")
    .withIndex("by_folder", (q) =>
      q.eq("libraryId", libraryId).eq("folderId", folderId),
    )
    .collect();
  return listings.map(mapDocumentListing);
}

async function getDocumentListing(
  ctx: Pick<GenericQueryCtx<DataModel>, "db">,
  documentId: Id<"documents">,
) {
  return await ctx.db
    .query("documentListings")
    .withIndex("by_document", (q) => q.eq("documentId", documentId))
    .first();
}

async function isPublishedFileBlockDocument(
  ctx: Pick<GenericQueryCtx<DataModel>, "db">,
  document: Doc<"documents">,
) {
  const layouts = await ctx.db
    .query("layouts")
    .withIndex("by_site", (q) => q.eq("siteId", document.siteId))
    .collect();

  for (const layout of layouts) {
    if (!layout.isDeployed) {
      continue;
    }

    for (const slot of layout.publishedSlots ?? []) {
      for (const block of slot.blocks) {
        if (
          block.type === "file" &&
          block.content?.documentId === document._id
        ) {
          return true;
        }
      }
    }
  }

  return false;
}

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
    snippet = `...${snippet}`;
  }
  if (end < text.length) {
    snippet = `${snippet}...`;
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
  listing: Doc<"documentListings">,
  matchType: "content" | "filename",
  searchTerm: string,
) {
  const visibleDocument = mapDocumentListing(listing);
  const snippetData =
    matchType === "content"
      ? extractSnippet(doc.extractedText, searchTerm)
      : null;

  return {
    _id: visibleDocument._id,
    filename: visibleDocument.filename,
    contentType: visibleDocument.contentType,
    size: visibleDocument.size,
    downloadUrl: visibleDocument.downloadUrl,
    libraryId: visibleDocument.libraryId,
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
  ctx: Pick<GenericQueryCtx<DataModel>, "db">,
  siteId: Id<"sites">,
  searchTerm: string,
  limit: number,
  activeLibraryIds?: string[],
) {
  // 1. Search by content (full-text search)
  const contentResults = await ctx.db
    .query("documents")
    .withSearchIndex("search_content", (q) =>
      q.search("extractedText", searchTerm).eq("siteId", siteId),
    )
    .take(limit * 2); // Fetch more to account for filtering

  // 2. Search by filename (using search index for better performance)
  const filenameResults = await ctx.db
    .query("documents")
    .withSearchIndex("search_filename", (q) =>
      q.search("filename", searchTerm).eq("siteId", siteId),
    )
    .take(limit * 2);

  // 3. Merge and deduplicate, prioritizing content matches
  const seen = new Set<string>();
  const combined: ReturnType<typeof formatSearchResult>[] = [];

  const getVisibleListing = async (doc: Doc<"documents">) => {
    const listing = await getDocumentListing(ctx, doc._id);
    if (!listing) return null;
    if (!activeLibraryIds) return listing;
    if (!listing.libraryId) return null;
    return activeLibraryIds.includes(listing.libraryId) ? listing : null;
  };

  // Content matches first (higher relevance)
  for (const doc of contentResults) {
    if (!seen.has(doc._id)) {
      const listing = await getVisibleListing(doc);
      if (!listing) continue;
      seen.add(doc._id);
      combined.push(formatSearchResult(doc, listing, "content", searchTerm));
    }
  }

  // Then filename matches
  for (const doc of filenameResults) {
    if (!seen.has(doc._id)) {
      const listing = await getVisibleListing(doc);
      if (!listing) continue;
      seen.add(doc._id);
      combined.push(formatSearchResult(doc, listing, "filename", searchTerm));
    }
  }

  return combined.slice(0, limit);
}

export const list = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return [];

    await requireMember(ctx, site.teamId);
    return await listDocumentsForSite(ctx, siteId);
  },
});

export const get = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc) return null;

    const site = await ctx.db.get(doc.siteId);
    if (!site) return null;

    await requireMember(ctx, site.teamId);
    return mapDocument(doc);
  },
});

export const search = query({
  args: {
    siteId: v.id("sites"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { siteId, query: searchQuery, limit = 20 }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return [];

    await requireMember(ctx, site.teamId);

    const trimmed = searchQuery.trim();
    if (!trimmed) return [];

    return performSearch(ctx, siteId, trimmed, limit);
  },
});

export const searchPublic = query({
  args: {
    siteId: v.id("sites"),
    query: v.string(),
    limit: v.optional(v.number()),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (
    ctx,
    { siteId, query: searchQuery, limit = 20, sessionTokens },
  ) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return [];

    const site = await ctx.db.get(siteId);
    if (!site || !(await canAccessPublishedSite(ctx, site, sessionTokens))) {
      return [];
    }

    const activeLibraryIds = await getActiveLibraryIds(ctx, siteId);

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

export const listPublic = query({
  args: {
    siteId: v.id("sites"),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { siteId, sessionTokens }) => {
    const site = await ctx.db.get(siteId);
    if (!site || !(await canAccessPublishedSite(ctx, site, sessionTokens))) {
      return [];
    }

    const activeLibraryIds = await getActiveLibraryIds(ctx, siteId);
    const allDocs = await listDocumentsForSite(ctx, siteId);

    return allDocs
      .filter((doc) => doc.libraryId && activeLibraryIds.has(doc.libraryId))
      .map((doc) => ({
        ...doc,
        downloadUrl: doc.downloadUrl,
      }));
  },
});

export const listByLibrary = query({
  args: { libraryId: v.id("documentLibraries") },
  handler: async (ctx, { libraryId }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site) return [];

    await requireMember(ctx, site.teamId);
    return await listDocumentsForLibrary(ctx, libraryId);
  },
});

export const listByFolder = query({
  args: {
    libraryId: v.id("documentLibraries"),
    folderId: v.optional(v.id("documentFolders")),
  },
  handler: async (ctx, { libraryId, folderId }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site) return [];

    await requireMember(ctx, site.teamId);
    return await listDocumentsForFolder(ctx, libraryId, folderId);
  },
});

export const listByLibraryPublic = query({
  args: {
    libraryId: v.id("documentLibraries"),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { libraryId, sessionTokens }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site || !(await canAccessPublishedSite(ctx, site, sessionTokens))) {
      return [];
    }

    const activeLibraryIds = await getActiveLibraryIds(ctx, library.siteId);
    if (!activeLibraryIds.has(libraryId)) return [];
    return await listDocumentsForLibrary(ctx, libraryId);
  },
});

export const listByFolderPublic = query({
  args: {
    libraryId: v.id("documentLibraries"),
    folderId: v.optional(v.id("documentFolders")),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { libraryId, folderId, sessionTokens }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site || !(await canAccessPublishedSite(ctx, site, sessionTokens))) {
      return [];
    }

    const activeLibraryIds = await getActiveLibraryIds(ctx, library.siteId);
    if (!activeLibraryIds.has(libraryId)) return [];
    return await listDocumentsForFolder(ctx, libraryId, folderId);
  },
});

export const getExtractionStats = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return null;

    await requireMember(ctx, site.teamId);

    const allDocs = await listDocumentsForSite(ctx, siteId);

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

export const listFailedExtraction = query({
  args: {
    siteId: v.id("sites"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { siteId, limit = 50 }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return [];

    await requireMember(ctx, site.teamId);
    return await ctx.db
      .query("documentListings")
      .withIndex("by_site_extraction_status", (q) =>
        q.eq("siteId", siteId).eq("extractionStatus", "failed"),
      )
      .take(limit)
      .then((docs) => docs.map(mapDocumentListing));
  },
});

export const searchByLibrary = query({
  args: {
    libraryId: v.id("documentLibraries"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { libraryId, query: searchQuery, limit = 20 }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site) return [];

    await requireMember(ctx, site.teamId);

    const trimmed = searchQuery.trim();
    if (!trimmed) return [];

    // Search by content
    const contentResults = await ctx.db
      .query("documents")
      .withSearchIndex("search_content", (q) =>
        q.search("extractedText", trimmed).eq("siteId", site._id),
      )
      .take(limit * 2);

    // Search by filename
    const filenameResults = await ctx.db
      .query("documents")
      .withSearchIndex("search_filename", (q) =>
        q.search("filename", trimmed).eq("siteId", site._id),
      )
      .take(limit * 2);

    // Merge and filter by library
    const seen = new Set<string>();
    const combined: ReturnType<typeof formatSearchResult>[] = [];

    for (const doc of contentResults) {
      if (seen.has(doc._id)) continue;
      const listing = await getDocumentListing(ctx, doc._id);
      if (!listing || listing.libraryId !== libraryId) continue;
      seen.add(doc._id);
      combined.push(formatSearchResult(doc, listing, "content", trimmed));
    }

    for (const doc of filenameResults) {
      if (seen.has(doc._id)) continue;
      const listing = await getDocumentListing(ctx, doc._id);
      if (!listing || listing.libraryId !== libraryId) continue;
      seen.add(doc._id);
      combined.push(formatSearchResult(doc, listing, "filename", trimmed));
    }

    return combined.slice(0, limit);
  },
});

export const getDownloadAsset = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const document = await ctx.db.get(documentId);
    if (!document) {
      return null;
    }

    const site = await ctx.db.get(document.siteId);
    if (!site) {
      return null;
    }

    await requireMember(ctx, site.teamId);

    const listing = await getDocumentListing(ctx, documentId);
    if (!listing) {
      return null;
    }

    if (!document.assetId) {
      return null;
    }

    const asset = await ctx.db.get(document.assetId);
    if (!asset) {
      return null;
    }

    return {
      documentId: document._id,
      filename: listing.filename,
      contentType: listing.contentType,
      size: listing.size,
      bucket: asset.bucket,
      objectKey: asset.objectKey,
    };
  },
});

export const getPublicDownloadAsset = query({
  args: {
    documentId: v.id("documents"),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { documentId, sessionTokens }) => {
    const document = await ctx.db.get(documentId);
    if (!document || !document.assetId) {
      return null;
    }

    const site = await ctx.db.get(document.siteId);
    if (!site || !(await canAccessPublishedSite(ctx, site, sessionTokens))) {
      return null;
    }

    const listing = await getDocumentListing(ctx, documentId);
    if (!listing) {
      return null;
    }

    if (listing.libraryId) {
      const activeLibraryIds = await getActiveLibraryIds(ctx, document.siteId);
      if (!activeLibraryIds.has(listing.libraryId)) {
        return null;
      }
    } else {
      const isPublishedFile = await isPublishedFileBlockDocument(ctx, document);
      if (!isPublishedFile) {
        return null;
      }
    }

    const asset = await ctx.db.get(document.assetId);
    if (!asset) {
      return null;
    }

    return {
      documentId: document._id,
      filename: listing.filename,
      contentType: listing.contentType,
      size: listing.size,
      bucket: asset.bucket,
      objectKey: asset.objectKey,
    };
  },
});
