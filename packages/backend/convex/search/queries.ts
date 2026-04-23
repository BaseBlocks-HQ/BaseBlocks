import type { GenericQueryCtx } from "convex/server";
import { v } from "convex/values";
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { checkIsMember } from "../auth";
import { mapDocumentListing } from "../documents/listings";
import { normalizeDocumentSearchMetadata } from "../lib/documentSearchMetadata";
import { getAccessiblePublishedPages } from "../lib/pageAccess";
import { getActiveLibraryIdsForPageIds } from "../lib/resolvers";
import { canAccessPublishedSite } from "../sharing/access";

/**
 * Extract a text snippet around the first occurrence of a search term
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

  const start = Math.max(0, matchIndex - contextLength);
  const end = Math.min(
    text.length,
    matchIndex + searchTerm.length + contextLength,
  );

  let snippet = text.slice(start, end);
  const matchStart = matchIndex - start;
  const matchEnd = matchStart + searchTerm.length;

  if (start > 0) {
    snippet = `...${snippet}`;
  }
  if (end < text.length) {
    snippet = `${snippet}...`;
  }

  return {
    snippet,
    matchStart: start > 0 ? matchStart + 3 : matchStart,
    matchEnd: start > 0 ? matchEnd + 3 : matchEnd,
  };
}

/**
 * Format search result from searchableContent
 */
function formatSearchResult(
  doc: Doc<"searchableContent">,
  matchType: "title" | "content",
  searchTerm: string,
  documentListing?: Doc<"documentListings"> | null,
) {
  const listing = documentListing ? mapDocumentListing(documentListing) : null;
  const snippetData =
    matchType === "content"
      ? extractSnippet(doc.extractedText, searchTerm)
      : null;

  return {
    _id: doc._id,
    contentType: doc.contentType,
    sourceId: doc.sourceId,
    title: listing?.filename ?? doc.title,
    matchType,
    snippet: snippetData?.snippet ?? null,
    snippetMatchStart: snippetData?.matchStart ?? null,
    snippetMatchEnd: snippetData?.matchEnd ?? null,
    metadata: listing
      ? normalizeDocumentSearchMetadata({
          sourceId: listing._id,
          metadata: {
            assetId: listing.assetId,
            filename: listing.filename,
            fileContentType: listing.contentType,
            size: listing.size,
            downloadUrl: listing.downloadUrl,
            libraryId: listing.libraryId,
          },
        })
      : doc.contentType === "document"
        ? normalizeDocumentSearchMetadata({
            sourceId: doc.sourceId,
            metadata: doc.metadata,
          })
        : doc.metadata,
  };
}

async function getDocumentListingForSearchResult(
  ctx: Pick<GenericQueryCtx<DataModel>, "db">,
  doc: Doc<"searchableContent">,
) {
  if (doc.contentType !== "document") return null;
  return await ctx.db
    .query("documentListings")
    .withIndex("by_document", (q) =>
      q.eq("documentId", doc.sourceId as Id<"documents">),
    )
    .first();
}

function formatDocumentTitleResult(doc: Doc<"documentListings">) {
  const listing = mapDocumentListing(doc);
  return {
    _id: `document:${listing._id}`,
    contentType: "document" as const,
    sourceId: listing._id,
    title: listing.filename,
    metadata: normalizeDocumentSearchMetadata({
      sourceId: listing._id,
      metadata: {
        assetId: listing.assetId,
        filename: listing.filename,
        fileContentType: listing.contentType,
        size: listing.size,
        downloadUrl: listing.downloadUrl,
        libraryId: listing.libraryId,
      },
    }),
  };
}

function formatPageTitleResult(page: {
  _id: string;
  title: string;
  publishedTitle?: string;
}) {
  return {
    _id: `page:${page._id}`,
    contentType: "page" as const,
    sourceId: page._id,
    title: page.publishedTitle ?? page.title,
    metadata: {
      pageId: page._id,
    },
  };
}

function contentTypeMatches(
  doc: Doc<"searchableContent">,
  contentTypes?: Array<"document" | "page">,
) {
  return !contentTypes?.length || contentTypes.includes(doc.contentType);
}

/**
 * Unified search across all content types (documents + pages)
 * For authenticated users (dashboard)
 */
export const searchAll = query({
  args: {
    siteId: v.id("sites"),
    query: v.string(),
    contentTypes: v.optional(
      v.array(v.union(v.literal("document"), v.literal("page"))),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { siteId, query: searchQuery, contentTypes, limit = 20 },
  ) => {
    const site = await ctx.db.get(siteId);
    if (!site) return [];

    if (!(await checkIsMember(ctx, site.teamId))) return [];

    const trimmed = searchQuery.trim();
    if (!trimmed) return [];

    // Search by title
    const titleResults = await ctx.db
      .query("searchableContent")
      .withSearchIndex("search_title", (q) =>
        q.search("title", trimmed).eq("siteId", siteId),
      )
      .take(limit * 2);

    // Search by content
    const contentResults = await ctx.db
      .query("searchableContent")
      .withSearchIndex("search_content", (q) =>
        q.search("extractedText", trimmed).eq("siteId", siteId),
      )
      .take(limit * 2);

    // Merge and deduplicate, prioritizing content matches
    const seen = new Set<string>();
    const combined: ReturnType<typeof formatSearchResult>[] = [];

    const getVisibleDocumentListing = async (doc: Doc<"searchableContent">) => {
      if (!contentTypeMatches(doc, contentTypes)) return null;
      if (doc.contentType !== "document") return null;
      return await getDocumentListingForSearchResult(ctx, doc);
    };

    const shouldIncludePage = (doc: Doc<"searchableContent">) => {
      if (doc.contentType !== "page") return false;
      return contentTypeMatches(doc, contentTypes);
    };

    // Content matches first (higher relevance)
    for (const doc of contentResults) {
      if (seen.has(doc._id)) continue;
      const listing = await getVisibleDocumentListing(doc);
      if (!listing && !shouldIncludePage(doc)) continue;
      seen.add(doc._id);
      combined.push(formatSearchResult(doc, "content", trimmed, listing));
    }

    // Then title matches
    for (const doc of titleResults) {
      if (seen.has(doc._id)) continue;
      const listing = await getVisibleDocumentListing(doc);
      if (!listing && !shouldIncludePage(doc)) continue;
      seen.add(doc._id);
      combined.push(formatSearchResult(doc, "title", trimmed, listing));
    }

    return combined.slice(0, limit);
  },
});

/**
 * Unified search for public site viewing
 * Only searches published sites and active library documents
 */
export const searchAllPublic = query({
  args: {
    siteId: v.id("sites"),
    query: v.string(),
    sessionTokens: v.optional(v.array(v.string())),
    contentTypes: v.optional(
      v.array(v.union(v.literal("document"), v.literal("page"))),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { siteId, query: searchQuery, sessionTokens, contentTypes, limit = 20 },
  ) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return [];

    const site = await ctx.db.get(siteId);
    if (!site || !(await canAccessPublishedSite(ctx, site, sessionTokens))) {
      return [];
    }

    const accessiblePages = await getAccessiblePublishedPages(
      ctx,
      site,
      sessionTokens,
    );
    const accessiblePageIds = new Set(accessiblePages.map((page) => page._id));
    const activeLibraryIds = await getActiveLibraryIdsForPageIds(
      ctx,
      siteId,
      accessiblePageIds,
    );

    // Search by title
    const titleResults = await ctx.db
      .query("searchableContent")
      .withSearchIndex("search_title", (q) =>
        q.search("title", trimmed).eq("siteId", siteId),
      )
      .take(limit * 2);

    // Search by content
    const contentResults = await ctx.db
      .query("searchableContent")
      .withSearchIndex("search_content", (q) =>
        q.search("extractedText", trimmed).eq("siteId", siteId),
      )
      .take(limit * 2);

    // Filter and deduplicate
    const seen = new Set<string>();
    const combined: ReturnType<typeof formatSearchResult>[] = [];

    const getVisibleDocumentListing = async (doc: Doc<"searchableContent">) => {
      if (!contentTypeMatches(doc, contentTypes)) return null;
      if (doc.contentType !== "document") return null;
      const listing = await getDocumentListingForSearchResult(ctx, doc);
      if (!listing?.libraryId || !activeLibraryIds.has(listing.libraryId)) {
        return null;
      }
      return listing;
    };

    const shouldIncludePage = (doc: Doc<"searchableContent">) => {
      if (!contentTypeMatches(doc, contentTypes)) return false;
      if (doc.contentType !== "page") return false;
      const pageId = doc.metadata.pageId;
      if (!pageId) return false;
      return accessiblePageIds.has(pageId);
    };

    // Content matches first
    for (const doc of contentResults) {
      if (seen.has(doc._id)) continue;
      const listing = await getVisibleDocumentListing(doc);
      if (!listing && !shouldIncludePage(doc)) continue;
      seen.add(doc._id);
      combined.push(formatSearchResult(doc, "content", trimmed, listing));
    }

    // Then title matches
    for (const doc of titleResults) {
      if (seen.has(doc._id)) continue;
      const listing = await getVisibleDocumentListing(doc);
      if (!listing && !shouldIncludePage(doc)) continue;
      seen.add(doc._id);
      combined.push(formatSearchResult(doc, "title", trimmed, listing));
    }

    return combined.slice(0, limit);
  },
});

/**
 * List all searchable content titles for a site (lightweight, for client-side fuzzy matching)
 * Returns only id, title, contentType, sourceId, and metadata - no extractedText
 */
export const listTitles = query({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return [];

    if (!(await checkIsMember(ctx, site.teamId))) return [];

    const [documents, pages] = await Promise.all([
      ctx.db
        .query("documentListings")
        .withIndex("by_site", (q) => q.eq("siteId", siteId))
        .collect(),
      ctx.db
        .query("pages")
        .withIndex("by_site", (q) => q.eq("siteId", siteId))
        .collect(),
    ]);

    return [
      ...documents.map(formatDocumentTitleResult),
      ...pages.map(formatPageTitleResult),
    ];
  },
});

/**
 * List all searchable content titles for a published site (public)
 */
export const listTitlesPublic = query({
  args: {
    siteId: v.id("sites"),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { siteId, sessionTokens }) => {
    const site = await ctx.db.get(siteId);
    if (!site || !(await canAccessPublishedSite(ctx, site, sessionTokens))) {
      return [];
    }

    const accessiblePages = await getAccessiblePublishedPages(
      ctx,
      site,
      sessionTokens,
    );
    const accessiblePageIds = new Set(accessiblePages.map((page) => page._id));
    const activeLibraryIds = await getActiveLibraryIdsForPageIds(
      ctx,
      siteId,
      accessiblePageIds,
    );

    const documents = await ctx.db
      .query("documentListings")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    return [
      ...documents
        .filter(
          (document) =>
            document.libraryId && activeLibraryIds.has(document.libraryId),
        )
        .map(formatDocumentTitleResult),
      ...accessiblePages.map(formatPageTitleResult),
    ];
  },
});
