// Flattened Convex domain module. Keep this file as the public API for this domain.
import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { v } from "convex/values";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { checkIsMember } from "./permissions";
import {
  buildDocumentDownloadUrl,
  normalizeDocumentSearchMetadata,
} from "./documents";
import { getAccessiblePublishedPages, canAccessPublishedSite } from "./sharing";
import { getActiveLibraryIdsForPageIds } from "./sites";

/**
 * Extract plain text from BlockNote document format for search indexing
 */
export function extractBlockNoteText(blocks: unknown[] | undefined): string {
  if (!blocks || !Array.isArray(blocks)) return "";

  const extractText = (node: unknown): string => {
    if (!node || typeof node !== "object") return "";

    const obj = node as Record<string, unknown>;
    let text = "";

    // Extract direct text content
    if (typeof obj.text === "string") {
      text += `${obj.text} `;
    }

    // Handle BlockNote inline content (text with styles)
    if (Array.isArray(obj.content)) {
      for (const child of obj.content) {
        if (typeof child === "string") {
          text += `${child} `;
        } else if (typeof child === "object" && child !== null) {
          const childObj = child as Record<string, unknown>;
          if (typeof childObj.text === "string") {
            text += `${childObj.text} `;
          }
          // Recursively extract from nested content
          text += extractText(child);
        }
      }
    }

    // Recursively extract from children array (nested blocks)
    if (Array.isArray(obj.children)) {
      for (const child of obj.children) {
        text += extractText(child);
      }
    }

    return text;
  };

  return blocks.map(extractText).join(" ").replace(/\s+/g, " ").trim();
}

type MutationCtx = GenericMutationCtx<DataModel>;

/**
 * Extract searchable text from all blocks across a page's layouts.
 */
function extractTextFromSlots(
  slots: Array<{
    blocks: Array<{ type: string; content: Record<string, unknown> }>;
  }>,
): string {
  const parts: string[] = [];

  for (const slot of slots) {
    for (const block of slot.blocks) {
      const c = block.content;
      if (!c) continue;

      switch (block.type) {
        case "richtext":
          if (Array.isArray(c.document)) {
            parts.push(extractBlockNoteText(c.document));
          }
          break;
        case "heading":
        case "paragraph":
          if (typeof c.text === "string") parts.push(c.text);
          break;
        case "callout":
          if (typeof c.title === "string") parts.push(c.title);
          if (typeof c.text === "string") parts.push(c.text);
          break;
        case "code":
          if (typeof c.code === "string") parts.push(c.code);
          break;
        case "quicklinks":
          if (Array.isArray(c.links)) {
            for (const link of c.links) {
              if (typeof link?.title === "string") parts.push(link.title);
              if (typeof link?.description === "string")
                parts.push(link.description);
            }
          }
          break;
        default:
          // For other block types, try extracting common text fields
          if (typeof c.text === "string") parts.push(c.text);
          if (typeof c.title === "string") parts.push(c.title);
          if (typeof c.description === "string") parts.push(c.description);
          break;
      }
    }
  }

  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Index or update a page's searchable content.
 *
 * Uses the page ID as the sourceId so search results stay attached to the
 * page itself, regardless of how it is surfaced in navigation.
 */
export async function indexPageContent(
  ctx: MutationCtx,
  pageId: Id<"pages">,
): Promise<void> {
  const page = await ctx.db.get(pageId);
  if (!page) return;

  // Get all layouts for this page
  const layouts = await ctx.db
    .query("layouts")
    .withIndex("by_page", (q) => q.eq("pageId", pageId))
    .collect();

  // Extract text from all layout slots
  const extractedText = layouts
    .map((l) => extractTextFromSlots(l.slots))
    .filter(Boolean)
    .join(" ")
    .trim();

  const combinedText = `${page.title} ${extractedText}`.trim();
  if (!combinedText) return;

  // Upsert into searchableContent
  const existing = await ctx.db
    .query("searchableContent")
    .withIndex("by_source", (q) =>
      q.eq("contentType", "page").eq("sourceId", pageId),
    )
    .first();

  const indexData = {
    siteId: page.siteId,
    contentType: "page" as const,
    sourceId: pageId,
    title: page.title,
    extractedText: combinedText,
    metadata: {
      pageId: page._id,
    },
    updatedAt: Date.now(),
  };

  if (existing) {
    await ctx.db.patch(existing._id, indexData);
  } else {
    await ctx.db.insert("searchableContent", indexData);
  }
}

/**
 * Remove a page's searchableContent entry.
 */
export async function removePageContentIndex(
  ctx: MutationCtx,
  pageId: Id<"pages">,
): Promise<void> {
  const existing = await ctx.db
    .query("searchableContent")
    .withIndex("by_source", (q) =>
      q.eq("contentType", "page").eq("sourceId", pageId),
    )
    .first();

  if (existing) {
    await ctx.db.delete(existing._id);
  }
}

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
  document?: Doc<"documents"> | null,
) {
  const snippetData =
    matchType === "content"
      ? extractSnippet(doc.extractedText, searchTerm)
      : null;

  return {
    _id: doc._id,
    contentType: doc.contentType,
    sourceId: doc.sourceId,
    title: document?.filename ?? doc.title,
    matchType,
    snippet: snippetData?.snippet ?? null,
    snippetMatchStart: snippetData?.matchStart ?? null,
    snippetMatchEnd: snippetData?.matchEnd ?? null,
    metadata: document
      ? normalizeDocumentSearchMetadata({
          sourceId: document._id,
          metadata: {
            assetId: document.assetId,
            filename: document.filename,
            fileContentType: document.contentType,
            size: document.size,
            downloadUrl: buildDocumentDownloadUrl(document._id),
            libraryId: document.libraryId,
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

async function getDocumentForSearchResult(
  ctx: Pick<GenericQueryCtx<DataModel>, "db">,
  doc: Doc<"searchableContent">,
) {
  if (doc.contentType !== "document") return null;
  return await ctx.db.get(doc.sourceId as Id<"documents">);
}

function formatDocumentTitleResult(document: Doc<"documents">) {
  return {
    _id: `document:${document._id}`,
    contentType: "document" as const,
    sourceId: document._id,
    title: document.filename,
    metadata: normalizeDocumentSearchMetadata({
      sourceId: document._id,
      metadata: {
        assetId: document.assetId,
        filename: document.filename,
        fileContentType: document.contentType,
        size: document.size,
        downloadUrl: buildDocumentDownloadUrl(document._id),
        libraryId: document.libraryId,
      },
    }),
  };
}

function formatPageTitleResult(page: { _id: string; title: string }) {
  return {
    _id: `page:${page._id}`,
    contentType: "page" as const,
    sourceId: page._id,
    title: page.title,
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

    const getVisibleDocument = async (doc: Doc<"searchableContent">) => {
      if (!contentTypeMatches(doc, contentTypes)) return null;
      if (doc.contentType !== "document") return null;
      return await getDocumentForSearchResult(ctx, doc);
    };

    const shouldIncludePage = (doc: Doc<"searchableContent">) => {
      if (doc.contentType !== "page") return false;
      return contentTypeMatches(doc, contentTypes);
    };

    // Content matches first (higher relevance)
    for (const doc of contentResults) {
      if (seen.has(doc._id)) continue;
      const document = await getVisibleDocument(doc);
      if (!document && !shouldIncludePage(doc)) continue;
      seen.add(doc._id);
      combined.push(formatSearchResult(doc, "content", trimmed, document));
    }

    // Then title matches
    for (const doc of titleResults) {
      if (seen.has(doc._id)) continue;
      const document = await getVisibleDocument(doc);
      if (!document && !shouldIncludePage(doc)) continue;
      seen.add(doc._id);
      combined.push(formatSearchResult(doc, "title", trimmed, document));
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

    const getVisibleDocument = async (doc: Doc<"searchableContent">) => {
      if (!contentTypeMatches(doc, contentTypes)) return null;
      if (doc.contentType !== "document") return null;
      const document = await getDocumentForSearchResult(ctx, doc);
      if (!document?.libraryId || !activeLibraryIds.has(document.libraryId)) {
        return null;
      }
      return document;
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
      const document = await getVisibleDocument(doc);
      if (!document && !shouldIncludePage(doc)) continue;
      seen.add(doc._id);
      combined.push(formatSearchResult(doc, "content", trimmed, document));
    }

    // Then title matches
    for (const doc of titleResults) {
      if (seen.has(doc._id)) continue;
      const document = await getVisibleDocument(doc);
      if (!document && !shouldIncludePage(doc)) continue;
      seen.add(doc._id);
      combined.push(formatSearchResult(doc, "title", trimmed, document));
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
        .query("documents")
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
      .query("documents")
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
