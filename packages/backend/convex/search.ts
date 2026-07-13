import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { v } from "convex/values";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { isOrganizationMember } from "./permissions";
import { normalizeFileSearchMetadata } from "./files";
import { getAccessiblePublishedPages, canAccessPublishedSite } from "./sharing";
import { getActiveLibraryIdsForPageIds } from "./model/sites";
import {
  extractOpenEditorText,
  type OpenEditorDocument,
  parseOpenEditorDocument,
} from "./pageContentFormat";

type MutationCtx = GenericMutationCtx<DataModel>;

export async function indexPageContent(
  ctx: MutationCtx,
  pageId: Id<"pages">,
  document?: OpenEditorDocument,
): Promise<void> {
  const page = await ctx.db.get(pageId);
  if (!page) return;

  let searchableDocument = document;
  if (!searchableDocument) {
    const content = await ctx.db
      .query("pageContents")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .unique();
    searchableDocument = content
      ? parseOpenEditorDocument(content.content)
      : undefined;
  }
  const extractedText = searchableDocument
    ? extractOpenEditorText(searchableDocument)
    : "";

  const combinedText = `${page.title} ${extractedText}`.trim();
  if (!combinedText) return;

  const existing = await ctx.db
    .query("searchEntries")
    .withIndex("by_source", (q) => q.eq("kind", "page").eq("sourceId", pageId))
    .first();

  const indexData = {
    siteId: page.siteId,
    kind: "page" as const,
    sourceId: pageId,
    title: page.title,
    text: combinedText,
    updatedAt: Date.now(),
  };

  if (existing) {
    await ctx.db.patch(existing._id, indexData);
  } else {
    await ctx.db.insert("searchEntries", indexData);
  }
}

export async function removePageContentIndex(
  ctx: MutationCtx,
  pageId: Id<"pages">,
): Promise<void> {
  const existing = await ctx.db
    .query("searchEntries")
    .withIndex("by_source", (q) => q.eq("kind", "page").eq("sourceId", pageId))
    .first();

  if (existing) {
    await ctx.db.delete(existing._id);
  }
}

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

function formatSearchResult(
  doc: Doc<"searchEntries">,
  matchType: "title" | "content",
  searchTerm: string,
  file?: Doc<"files"> | null,
) {
  const snippetData =
    matchType === "content" ? extractSnippet(doc.text, searchTerm) : null;

  return {
    _id: doc._id,
    contentType: doc.kind,
    sourceId: doc.sourceId,
    title: file?.filename ?? doc.title,
    matchType,
    snippet: snippetData?.snippet ?? null,
    snippetMatchStart: snippetData?.matchStart ?? null,
    snippetMatchEnd: snippetData?.matchEnd ?? null,
    metadata: file
      ? normalizeFileSearchMetadata(file)
      : doc.kind === "page"
        ? { pageId: doc.sourceId as Id<"pages"> }
        : {},
  };
}

async function getFileForSearchResult(
  ctx: Pick<GenericQueryCtx<DataModel>, "db">,
  doc: Doc<"searchEntries">,
) {
  if (doc.kind !== "file") return null;
  return await ctx.db.get(doc.sourceId as Id<"files">);
}

function contentTypeMatches(
  doc: Doc<"searchEntries">,
  contentTypes?: Array<"file" | "page">,
) {
  return !contentTypes?.length || contentTypes.includes(doc.kind);
}

export const searchAll = query({
  args: {
    siteId: v.id("sites"),
    query: v.string(),
    contentTypes: v.optional(
      v.array(v.union(v.literal("file"), v.literal("page"))),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { siteId, query: searchQuery, contentTypes, limit = 20 },
  ) => {
    const site = await ctx.db.get(siteId);
    if (!site) return [];

    if (!(await isOrganizationMember(ctx, site.organizationId))) return [];

    const trimmed = searchQuery.trim();
    if (!trimmed) return [];

    const titleResults = await ctx.db
      .query("searchEntries")
      .withSearchIndex("search_title", (q) =>
        q.search("title", trimmed).eq("siteId", siteId),
      )
      .take(limit * 2);

    const contentResults = await ctx.db
      .query("searchEntries")
      .withSearchIndex("search_text", (q) =>
        q.search("text", trimmed).eq("siteId", siteId),
      )
      .take(limit * 2);

    const seen = new Set<string>();
    const combined: ReturnType<typeof formatSearchResult>[] = [];

    const getVisibleFile = async (doc: Doc<"searchEntries">) => {
      if (!contentTypeMatches(doc, contentTypes)) return null;
      if (doc.kind !== "file") return null;
      return await getFileForSearchResult(ctx, doc);
    };

    const shouldIncludePage = (doc: Doc<"searchEntries">) => {
      if (doc.kind !== "page") return false;
      return contentTypeMatches(doc, contentTypes);
    };

    for (const doc of contentResults) {
      if (seen.has(doc._id)) continue;
      const file = await getVisibleFile(doc);
      if (!file && !shouldIncludePage(doc)) continue;
      seen.add(doc._id);
      combined.push(formatSearchResult(doc, "content", trimmed, file));
    }

    for (const doc of titleResults) {
      if (seen.has(doc._id)) continue;
      const file = await getVisibleFile(doc);
      if (!file && !shouldIncludePage(doc)) continue;
      seen.add(doc._id);
      combined.push(formatSearchResult(doc, "title", trimmed, file));
    }

    return combined.slice(0, limit);
  },
});

export const searchAllPublic = query({
  args: {
    siteId: v.id("sites"),
    query: v.string(),
    contentTypes: v.optional(
      v.array(v.union(v.literal("file"), v.literal("page"))),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { siteId, query: searchQuery, contentTypes, limit = 20 },
  ) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return [];

    const site = await ctx.db.get(siteId);
    if (!site || !canAccessPublishedSite(site)) {
      return [];
    }

    const accessiblePages = await getAccessiblePublishedPages(ctx, site);
    const accessiblePageIds = new Set(accessiblePages.map((page) => page._id));
    const activeLibraryIds = await getActiveLibraryIdsForPageIds(
      ctx,
      siteId,
      accessiblePageIds,
    );

    const titleResults = await ctx.db
      .query("searchEntries")
      .withSearchIndex("search_title", (q) =>
        q.search("title", trimmed).eq("siteId", siteId),
      )
      .take(limit * 2);

    const contentResults = await ctx.db
      .query("searchEntries")
      .withSearchIndex("search_text", (q) =>
        q.search("text", trimmed).eq("siteId", siteId),
      )
      .take(limit * 2);

    const seen = new Set<string>();
    const combined: ReturnType<typeof formatSearchResult>[] = [];

    const getVisibleFile = async (doc: Doc<"searchEntries">) => {
      if (!contentTypeMatches(doc, contentTypes)) return null;
      if (doc.kind !== "file") return null;
      const file = await getFileForSearchResult(ctx, doc);
      if (!file?.libraryId || !activeLibraryIds.has(file.libraryId)) {
        return null;
      }
      return file;
    };

    const shouldIncludePage = (doc: Doc<"searchEntries">) => {
      if (!contentTypeMatches(doc, contentTypes)) return false;
      if (doc.kind !== "page") return false;
      return accessiblePageIds.has(doc.sourceId as Id<"pages">);
    };

    for (const doc of contentResults) {
      if (seen.has(doc._id)) continue;
      const file = await getVisibleFile(doc);
      if (!file && !shouldIncludePage(doc)) continue;
      seen.add(doc._id);
      combined.push(formatSearchResult(doc, "content", trimmed, file));
    }

    for (const doc of titleResults) {
      if (seen.has(doc._id)) continue;
      const file = await getVisibleFile(doc);
      if (!file && !shouldIncludePage(doc)) continue;
      seen.add(doc._id);
      combined.push(formatSearchResult(doc, "title", trimmed, file));
    }

    return combined.slice(0, limit);
  },
});
