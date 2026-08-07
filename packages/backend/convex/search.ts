import type { GenericMutationCtx } from "convex/server";
import { v } from "convex/values";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { internalMutation, query } from "./_generated/server";
import { isOrganizationMember } from "./permissions";
import { readPageContent } from "./model/pageDocuments";
import { assertDraftReadable } from "./model/draft";
import { canRenderPublishedSite, resolvePublishedSiteAccess } from "./sharing";
import {
  extractOpenEditorText,
  parseOpenEditorDocument,
  type OpenEditorDocument,
} from "./pageContentFormat";

type MutationCtx = GenericMutationCtx<DataModel>;

const SEARCH_COALESCE_MS = 10_000;
const MAX_SEARCH_RESULTS = 50;

export function normalizeSearchLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return 20;
  return Math.max(1, Math.min(MAX_SEARCH_RESULTS, Math.floor(limit)));
}

function singleContentType(contentTypes?: Array<"file" | "page">) {
  const unique = [...new Set(contentTypes)];
  return unique.length === 1 ? unique[0] : undefined;
}

export async function queuePageContentIndex(
  ctx: MutationCtx,
  pageId: Id<"pages">,
  revisionId: Id<"contentRevisions">,
  contentHash: string,
) {
  const page = await ctx.db.get(pageId);
  if (!page) return;
  const existing = await ctx.db
    .query("pageSearchJobs")
    .withIndex("by_page", (q) => q.eq("pageId", pageId))
    .unique();
  const value = {
    siteId: page.siteId,
    pageId,
    revisionId,
    contentHash,
    updatedAt: Date.now(),
  };
  if (existing) await ctx.db.replace(existing._id, value);
  else await ctx.db.insert("pageSearchJobs", value);
  await ctx.scheduler.runAfter(
    SEARCH_COALESCE_MS,
    internal.search.flushPageIndex,
    {
      pageId,
      revisionId,
    },
  );
}

export async function indexPageContent(
  ctx: MutationCtx,
  pageId: Id<"pages">,
  document?: OpenEditorDocument,
): Promise<void> {
  const page = await ctx.db.get(pageId);
  if (!page) return;
  const site = await ctx.db.get(page.siteId);
  if (!site) return;

  let searchableDocument = document;
  if (!searchableDocument) {
    searchableDocument = (await readPageContent(ctx, pageId)).document;
  }
  const extractedText = searchableDocument
    ? extractOpenEditorText(searchableDocument)
    : "";

  const existing = await ctx.db
    .query("searchEntries")
    .withIndex("by_source", (q) => q.eq("kind", "page").eq("sourceId", pageId))
    .first();

  const indexData = {
    siteId: page.siteId,
    kind: "page" as const,
    audience: "private" as const,
    sourceId: pageId,
    title: page.title,
    text: extractedText.trim(),
    updatedAt: Date.now(),
  };

  if (existing) {
    await ctx.db.patch(existing._id, indexData);
  } else {
    await ctx.db.insert("searchEntries", indexData);
  }
}

export const flushPageIndex = internalMutation({
  args: {
    pageId: v.id("pages"),
    revisionId: v.id("contentRevisions"),
  },
  returns: v.null(),
  handler: async (ctx, { pageId, revisionId }) => {
    const job = await ctx.db
      .query("pageSearchJobs")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .unique();
    if (!job || job.revisionId !== revisionId) return null;
    const revision = await ctx.db.get(revisionId);
    if (!revision) return null;
    const payload = await ctx.db.get(revision.payloadId);
    if (!payload) return null;
    const page = await ctx.db.get(pageId);
    if (!page || page.deletedAt !== undefined) {
      await ctx.db.delete(job._id);
      return null;
    }
    const extractedText = extractOpenEditorText(
      parseOpenEditorDocument(payload.content),
    ).trim();
    const existing = await ctx.db
      .query("searchEntries")
      .withIndex("by_source", (q) =>
        q.eq("kind", "page").eq("sourceId", pageId),
      )
      .first();
    const indexData = {
      siteId: page.siteId,
      kind: "page" as const,
      audience: "private" as const,
      sourceId: pageId,
      title: page.title,
      text: extractedText,
      updatedAt: Date.now(),
    };
    if (existing) await ctx.db.patch(existing._id, indexData);
    else await ctx.db.insert("searchEntries", indexData);
    await ctx.db.delete(job._id);
    return null;
  },
});

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
  const pending = await ctx.db
    .query("pageSearchJobs")
    .withIndex("by_page", (q) => q.eq("pageId", pageId))
    .unique();
  if (pending) await ctx.db.delete(pending._id);
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
) {
  const snippetData =
    matchType === "content" ? extractSnippet(doc.text, searchTerm) : null;

  return {
    _id: String(doc._id),
    contentType: doc.kind,
    sourceId: doc.sourceId,
    title: doc.fileMetadata?.filename ?? doc.title,
    matchType,
    snippet: snippetData?.snippet ?? null,
    snippetMatchStart: snippetData?.matchStart ?? null,
    snippetMatchEnd: snippetData?.matchEnd ?? null,
    metadata: doc.fileMetadata
      ? doc.fileMetadata
      : doc.kind === "page"
        ? { pageId: doc.sourceId as Id<"pages"> }
        : {},
  };
}

function formatReleaseSearchResult(
  doc: Doc<"releaseSearchEntries">,
  matchType: "title" | "content",
  searchTerm: string,
) {
  const snippetData =
    matchType === "content" ? extractSnippet(doc.text, searchTerm) : null;
  return {
    _id: String(doc._id),
    contentType: doc.kind,
    sourceId: doc.sourceId,
    title: doc.fileMetadata?.filename ?? doc.title,
    matchType,
    snippet: snippetData?.snippet ?? null,
    snippetMatchStart: snippetData?.matchStart ?? null,
    snippetMatchEnd: snippetData?.matchEnd ?? null,
    metadata: doc.fileMetadata
      ? doc.fileMetadata
      : doc.kind === "page"
        ? { pageId: doc.sourceId as Id<"pages"> }
        : {},
  };
}

function contentTypeMatches(
  doc: Pick<Doc<"searchEntries"> | Doc<"releaseSearchEntries">, "kind">,
  contentTypes?: Array<"file" | "page">,
) {
  return !contentTypes?.length || contentTypes.includes(doc.kind);
}

export function mergeSearchMatches<
  TDoc extends { _id: string; kind: "file" | "page" },
  TResult,
>(args: {
  titleResults: TDoc[];
  contentResults: TDoc[];
  contentTypes?: Array<"file" | "page">;
  limit: number;
  format: (doc: TDoc, matchType: "title" | "content") => TResult;
}): TResult[] {
  const seen = new Set<string>();
  const combined: TResult[] = [];
  for (const [results, matchType] of [
    [args.titleResults, "title"],
    [args.contentResults, "content"],
  ] as const) {
    for (const doc of results) {
      if (seen.has(doc._id)) continue;
      if (!contentTypeMatches(doc, args.contentTypes)) continue;
      seen.add(doc._id);
      combined.push(args.format(doc, matchType));
    }
  }
  return combined.slice(0, args.limit);
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
    assertDraftReadable(site);

    const trimmed = searchQuery.trim();
    if (!trimmed) return [];
    const boundedLimit = normalizeSearchLimit(limit);
    const indexedContentType = singleContentType(contentTypes);

    const titleResults = await ctx.db
      .query("searchEntries")
      .withSearchIndex("search_title", (q) => {
        const search = q.search("title", trimmed).eq("siteId", siteId);
        return indexedContentType
          ? search.eq("kind", indexedContentType)
          : search;
      })
      .take(boundedLimit * 2);

    const contentResults = await ctx.db
      .query("searchEntries")
      .withSearchIndex("search_text", (q) => {
        const search = q.search("text", trimmed).eq("siteId", siteId);
        return indexedContentType
          ? search.eq("kind", indexedContentType)
          : search;
      })
      .take(boundedLimit * 2);

    // Preserve the more specific classification when a result satisfies both
    // indexes, then de-duplicate the broader content results.
    return mergeSearchMatches({
      titleResults,
      contentResults,
      contentTypes,
      limit: boundedLimit,
      format: (doc, matchType) => formatSearchResult(doc, matchType, trimmed),
    });
  },
});

export const searchPublished = query({
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
    if (!site) {
      return [];
    }
    const access = await resolvePublishedSiteAccess(ctx, site);
    if (!canRenderPublishedSite(access)) return [];
    if (!site.liveReleaseId) return [];
    const boundedLimit = normalizeSearchLimit(limit);
    const indexedContentType = singleContentType(contentTypes);

    const titleResults = await ctx.db
      .query("releaseSearchEntries")
      .withSearchIndex("search_title", (q) => {
        const search = q
          .search("title", trimmed)
          .eq("releaseId", site.liveReleaseId!);
        return indexedContentType
          ? search.eq("kind", indexedContentType)
          : search;
      })
      .take(boundedLimit * 2);

    const contentResults = await ctx.db
      .query("releaseSearchEntries")
      .withSearchIndex("search_text", (q) => {
        const search = q
          .search("text", trimmed)
          .eq("releaseId", site.liveReleaseId!);
        return indexedContentType
          ? search.eq("kind", indexedContentType)
          : search;
      })
      .take(boundedLimit * 2);

    return mergeSearchMatches({
      titleResults,
      contentResults,
      contentTypes,
      limit: boundedLimit,
      format: (doc, matchType) =>
        formatReleaseSearchResult(doc, matchType, trimmed),
    });
  },
});
