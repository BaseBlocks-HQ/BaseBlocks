import type { GenericQueryCtx } from "convex/server";
import { v } from "convex/values";
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { requireMember } from "../auth";
import { getActiveLibraryIds } from "../lib/resolvers";
import { canAccessPublishedSite } from "../sharing/access";
import { buildDocumentDownloadUrl } from "../assets/urls";
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
  const pages = await ctx.db
    .query("pages")
    .withIndex("by_site", (q) => q.eq("siteId", document.siteId))
    .collect();

  const hasFileBlock = (blocks: unknown[]): boolean => {
    for (const block of blocks) {
      if (typeof block !== "object" || block === null) continue;

      if (
        "type" in block &&
        block.type === "file" &&
        "content" in block &&
        typeof block.content === "object" &&
        block.content !== null &&
        "documentId" in block.content &&
        block.content.documentId === document._id
      ) {
        return true;
      }

      if ("columns" in block && Array.isArray(block.columns)) {
        for (const column of block.columns) {
          if (
            typeof column === "object" &&
            column !== null &&
            "blocks" in column &&
            Array.isArray(column.blocks) &&
            hasFileBlock(column.blocks)
          ) {
            return true;
          }
        }
      }

      if ("tabs" in block && Array.isArray(block.tabs)) {
        for (const tab of block.tabs) {
          if (
            typeof tab === "object" &&
            tab !== null &&
            "blocks" in tab &&
            Array.isArray(tab.blocks) &&
            hasFileBlock(tab.blocks)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  return pages.some((page) => hasFileBlock(page.publishedContent?.blocks ?? []));
}

/**
 * Format search result.
 */
function formatSearchResult(
  listing: Doc<"documentListings">,
  matchType: "filename",
) {
  const visibleDocument = mapDocumentListing(listing);

  return {
    _id: visibleDocument._id,
    filename: visibleDocument.filename,
    contentType: visibleDocument.contentType,
    size: visibleDocument.size,
    downloadUrl: visibleDocument.downloadUrl,
    libraryId: visibleDocument.libraryId,
    matchType,
    snippet: null,
    snippetMatchStart: null,
    snippetMatchEnd: null,
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
  const filenameResults = await ctx.db
    .query("documents")
    .withSearchIndex("search_filename", (q) =>
      q.search("filename", searchTerm).eq("siteId", siteId),
    )
    .take(limit * 2);

  const seen = new Set<string>();
  const combined: ReturnType<typeof formatSearchResult>[] = [];

  const getVisibleListing = async (doc: Doc<"documents">) => {
    const listing = await getDocumentListing(ctx, doc._id);
    if (!listing) return null;
    if (!activeLibraryIds) return listing;
    if (!listing.libraryId) return null;
    return activeLibraryIds.includes(listing.libraryId) ? listing : null;
  };

  for (const doc of filenameResults) {
    if (!seen.has(doc._id)) {
      const listing = await getVisibleListing(doc);
      if (!listing) continue;
      seen.add(doc._id);
      combined.push(formatSearchResult(listing, "filename"));
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

    const filenameResults = await ctx.db
      .query("documents")
      .withSearchIndex("search_filename", (q) =>
        q.search("filename", trimmed).eq("siteId", site._id),
      )
      .take(limit * 2);

    const seen = new Set<string>();
    const combined: ReturnType<typeof formatSearchResult>[] = [];

    for (const doc of filenameResults) {
      if (seen.has(doc._id)) continue;
      const listing = await getDocumentListing(ctx, doc._id);
      if (!listing || listing.libraryId !== libraryId) continue;
      seen.add(doc._id);
      combined.push(formatSearchResult(listing, "filename"));
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
