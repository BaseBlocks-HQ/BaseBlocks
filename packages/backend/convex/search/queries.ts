import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { requireMember } from "../auth";
import { getActiveLibraryIds } from "../lib/resolvers";

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
) {
  const snippetData =
    matchType === "content"
      ? extractSnippet(doc.extractedText, searchTerm)
      : null;

  return {
    _id: doc._id,
    contentType: doc.contentType,
    sourceId: doc.sourceId,
    title: doc.title,
    matchType,
    snippet: snippetData?.snippet ?? null,
    snippetMatchStart: snippetData?.matchStart ?? null,
    snippetMatchEnd: snippetData?.matchEnd ?? null,
    metadata: doc.metadata,
  };
}

/**
 * Unified search across all content types (documents + subpages)
 * For authenticated users (dashboard)
 */
export const searchAll = query({
  args: {
    siteId: v.id("sites"),
    query: v.string(),
    contentTypes: v.optional(
      v.array(v.union(v.literal("document"), v.literal("subpage"))),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { siteId, query: searchQuery, contentTypes, limit = 20 },
  ) => {
    const site = await ctx.db.get(siteId);
    if (!site) return [];

    await requireMember(ctx, site.teamId);

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

    // Filter by content type if specified
    const shouldInclude = (doc: Doc<"searchableContent">) => {
      if (!contentTypes || contentTypes.length === 0) return true;
      return contentTypes.includes(doc.contentType);
    };

    // Content matches first (higher relevance)
    for (const doc of contentResults) {
      if (!seen.has(doc._id) && shouldInclude(doc)) {
        seen.add(doc._id);
        combined.push(formatSearchResult(doc, "content", trimmed));
      }
    }

    // Then title matches
    for (const doc of titleResults) {
      if (!seen.has(doc._id) && shouldInclude(doc)) {
        seen.add(doc._id);
        combined.push(formatSearchResult(doc, "title", trimmed));
      }
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
    contentTypes: v.optional(
      v.array(v.union(v.literal("document"), v.literal("subpage"))),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { siteId, query: searchQuery, contentTypes, limit = 20 },
  ) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return [];

    // Check site is published
    const site = await ctx.db.get(siteId);
    if (!site || !site.isPublished) return [];

    const activeLibraryIds = await getActiveLibraryIds(ctx, siteId);

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

    const shouldInclude = (doc: Doc<"searchableContent">) => {
      // Filter by content type if specified
      if (
        contentTypes &&
        contentTypes.length > 0 &&
        !contentTypes.includes(doc.contentType)
      ) {
        return false;
      }

      // For documents, only include if in active library
      if (doc.contentType === "document") {
        const libraryId = doc.metadata.libraryId;
        if (!libraryId) return false;
        return activeLibraryIds.has(libraryId);
      }

      // Subpages are always included (they're part of the site)
      return true;
    };

    // Content matches first
    for (const doc of contentResults) {
      if (!seen.has(doc._id) && shouldInclude(doc)) {
        seen.add(doc._id);
        combined.push(formatSearchResult(doc, "content", trimmed));
      }
    }

    // Then title matches
    for (const doc of titleResults) {
      if (!seen.has(doc._id) && shouldInclude(doc)) {
        seen.add(doc._id);
        combined.push(formatSearchResult(doc, "title", trimmed));
      }
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

    await requireMember(ctx, site.teamId);

    const all = await ctx.db
      .query("searchableContent")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    return all.map((doc) => ({
      _id: doc._id,
      contentType: doc.contentType,
      sourceId: doc.sourceId,
      title: doc.title,
      metadata: doc.metadata,
    }));
  },
});

/**
 * List all searchable content titles for a published site (public)
 */
export const listTitlesPublic = query({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site || !site.isPublished) return [];

    const activeLibraryIds = await getActiveLibraryIds(ctx, siteId);

    const all = await ctx.db
      .query("searchableContent")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    return all
      .filter((doc) => {
        if (doc.contentType === "document") {
          return (
            doc.metadata.libraryId &&
            activeLibraryIds.has(doc.metadata.libraryId)
          );
        }
        return true; // subpages always included
      })
      .map((doc) => ({
        _id: doc._id,
        contentType: doc.contentType,
        sourceId: doc.sourceId,
        title: doc.title,
        metadata: doc.metadata,
      }));
  },
});
