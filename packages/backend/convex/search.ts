import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import { internalMutation, query } from "./_generated/server";
import { readContentRevisionSearchText } from "./model/contentObjects";
import { assertDraftReadable } from "./model/draft";
import { isOrganizationMember } from "./permissions";
import { canRenderPublishedSite, resolvePublishedSiteAccess } from "./sharing";

type MutationCtx = GenericMutationCtx<DataModel>;
type QueryCtx = GenericQueryCtx<DataModel>;
type SearchKind = "file" | "page";
type SearchMatch = "content" | "title";

const SEARCH_COALESCE_MS = 3_000;
const MAX_SEARCH_RESULTS = 50;

export function normalizeSearchLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return 20;
  return Math.max(1, Math.min(MAX_SEARCH_RESULTS, Math.floor(limit)));
}

export function draftSearchScope(siteId: Id<"sites">): string {
  return `draft:${siteId}`;
}

/**
 * One search scope per site for the published surface, rebuilt from the
 * live release manifest by the post-publication projection. Full text is
 * stored once per site, not once per historical release.
 */
export function liveSearchScope(siteId: Id<"sites">): string {
  return `live:${siteId}`;
}

export function isPublishedSearchEntryForRelease(
  entry: Pick<Doc<"searchEntries">, "releaseId">,
  releaseId: Id<"siteReleases">,
): boolean {
  return entry.releaseId === releaseId;
}

export async function upsertSearchEntry(
  ctx: MutationCtx,
  value: {
    siteId: Id<"sites">;
    scopeId: string;
    releaseId?: Id<"siteReleases">;
    kind: SearchKind;
    sourceId: string;
    title: string;
    text: string;
  },
): Promise<void> {
  const existing = await ctx.db
    .query("searchEntries")
    .withIndex("by_scope_source", (q) =>
      q
        .eq("scopeId", value.scopeId)
        .eq("kind", value.kind)
        .eq("sourceId", value.sourceId),
    )
    .unique();
  const entry = { ...value, text: value.text.trim(), updatedAt: Date.now() };
  if (existing) await ctx.db.replace(existing._id, entry);
  else await ctx.db.insert("searchEntries", entry);
}

export async function removeSearchEntry(
  ctx: MutationCtx,
  scopeId: string,
  kind: SearchKind,
  sourceId: string,
): Promise<void> {
  const existing = await ctx.db
    .query("searchEntries")
    .withIndex("by_scope_source", (q) =>
      q.eq("scopeId", scopeId).eq("kind", kind).eq("sourceId", sourceId),
    )
    .unique();
  if (existing) await ctx.db.delete(existing._id);
}

export async function upsertDraftFileSearch(
  ctx: MutationCtx,
  file: Doc<"files">,
  text: string,
): Promise<void> {
  await upsertSearchEntry(ctx, {
    siteId: file.siteId,
    scopeId: draftSearchScope(file.siteId),
    kind: "file",
    sourceId: file._id,
    title: file.filename,
    text,
  });
}

export async function queuePageContentIndex(
  ctx: MutationCtx,
  pageId: Id<"pages">,
  revisionId: Id<"contentRevisions">,
): Promise<void> {
  await ctx.scheduler.runAfter(
    SEARCH_COALESCE_MS,
    internal.search.flushPageIndex,
    { pageId, revisionId },
  );
}

export async function indexPageContent(
  ctx: MutationCtx,
  pageId: Id<"pages">,
): Promise<void> {
  const page = await ctx.db.get(pageId);
  if (!page || page.deletedAt !== undefined) return;
  const record = await ctx.db
    .query("pageDocuments")
    .withIndex("by_page", (q) => q.eq("pageId", pageId))
    .unique();
  await upsertSearchEntry(ctx, {
    siteId: page.siteId,
    scopeId: draftSearchScope(page.siteId),
    kind: "page",
    sourceId: pageId,
    title: page.title,
    text: await readContentRevisionSearchText(ctx, record?.revisionId),
  });
}

export const flushPageIndex = internalMutation({
  args: {
    pageId: v.id("pages"),
    revisionId: v.id("contentRevisions"),
  },
  returns: v.null(),
  handler: async (ctx, { pageId, revisionId }) => {
    const current = await ctx.db
      .query("pageDocuments")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .unique();
    if (!current || current.revisionId !== revisionId) return null;
    await indexPageContent(ctx, pageId);
    return null;
  },
});

export async function removePageContentIndex(
  ctx: MutationCtx,
  pageId: Id<"pages">,
): Promise<void> {
  const page = await ctx.db.get(pageId);
  if (!page) return;
  await removeSearchEntry(ctx, draftSearchScope(page.siteId), "page", pageId);
}

export function extractSearchExcerpt(
  text: string,
  searchTerm: string,
  contextLength = 80,
): { text: string; matchStart: number; matchEnd: number } | null {
  const matchIndex = text
    .toLocaleLowerCase()
    .indexOf(searchTerm.toLocaleLowerCase());
  if (matchIndex === -1) return null;
  const start = Math.max(0, matchIndex - contextLength);
  const end = Math.min(
    text.length,
    matchIndex + searchTerm.length + contextLength,
  );
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return {
    text: `${prefix}${text.slice(start, end)}${suffix}`,
    matchStart: matchIndex - start + prefix.length,
    matchEnd: matchIndex - start + prefix.length + searchTerm.length,
  };
}

export function mergeSearchMatches<TDoc extends { _id: string }>(args: {
  titleResults: TDoc[];
  contentResults: TDoc[];
  limit: number;
}): Array<{ doc: TDoc; match: SearchMatch }> {
  const seen = new Set<string>();
  const combined: Array<{ doc: TDoc; match: SearchMatch }> = [];
  for (const [results, match] of [
    [args.titleResults, "title"],
    [args.contentResults, "content"],
  ] as const) {
    for (const doc of results) {
      if (seen.has(doc._id)) continue;
      seen.add(doc._id);
      combined.push({ doc, match });
      if (combined.length === args.limit) return combined;
    }
  }
  return combined;
}

async function searchScope(
  ctx: QueryCtx,
  scopeId: string,
  searchQuery: string,
  limit: number,
) {
  const [titleResults, contentResults] = await Promise.all([
    ctx.db
      .query("searchEntries")
      .withSearchIndex("search_title", (q) =>
        q.search("title", searchQuery).eq("scopeId", scopeId),
      )
      .take(limit),
    ctx.db
      .query("searchEntries")
      .withSearchIndex("search_text", (q) =>
        q.search("text", searchQuery).eq("scopeId", scopeId),
      )
      .take(limit * 2),
  ]);
  return mergeSearchMatches({ titleResults, contentResults, limit });
}

async function hydrateDraftResult(
  ctx: QueryCtx,
  entry: Doc<"searchEntries">,
  match: SearchMatch,
  searchTerm: string,
) {
  const excerpt =
    match === "content" ? extractSearchExcerpt(entry.text, searchTerm) : null;
  if (entry.kind === "page") {
    const pageId = ctx.db.normalizeId("pages", entry.sourceId);
    const page = pageId ? await ctx.db.get(pageId) : null;
    if (!page || page.deletedAt !== undefined || page.siteId !== entry.siteId) {
      return null;
    }
    return {
      key: `page:${page._id}`,
      kind: "page" as const,
      pageId: page._id,
      title: page.title,
      match,
      excerpt,
    };
  }
  const fileId = ctx.db.normalizeId("files", entry.sourceId);
  const file = fileId ? await ctx.db.get(fileId) : null;
  if (
    file?.kind !== "file" ||
    file.deletedAt !== undefined ||
    file.siteId !== entry.siteId
  ) {
    return null;
  }
  return {
    key: `file:${file._id}`,
    kind: "file" as const,
    fileId: file._id,
    title: file.filename,
    contentType: file.contentType,
    size: file.size,
    downloadUrl: `/api/files/${file._id}`,
    match,
    excerpt,
  };
}

async function hydrateReleaseResult(
  ctx: QueryCtx,
  releaseId: Id<"siteReleases">,
  entry: Doc<"searchEntries">,
  match: SearchMatch,
  searchTerm: string,
) {
  const excerpt =
    match === "content" ? extractSearchExcerpt(entry.text, searchTerm) : null;
  if (entry.kind === "page") {
    const pageId = ctx.db.normalizeId("pages", entry.sourceId);
    if (!pageId) return null;
    const page = await ctx.db
      .query("releasePages")
      .withIndex("by_release_page", (q) =>
        q.eq("releaseId", releaseId).eq("pageId", pageId),
      )
      .unique();
    return page
      ? {
          key: `page:${page.pageId}`,
          kind: "page" as const,
          pageId: page.pageId,
          title: page.title,
          match,
          excerpt,
        }
      : null;
  }
  const fileId = ctx.db.normalizeId("files", entry.sourceId);
  if (!fileId) return null;
  const file = await ctx.db
    .query("releaseFiles")
    .withIndex("by_release_file", (q) =>
      q.eq("releaseId", releaseId).eq("fileId", fileId),
    )
    .unique();
  return file?.kind === "file"
    ? {
        key: `file:${file.fileId}`,
        kind: "file" as const,
        fileId: file.fileId,
        title: file.filename,
        contentType: file.contentType,
        size: file.size,
        downloadUrl: `/api/files/${file.fileId}`,
        match,
        excerpt,
      }
    : null;
}

export const run = query({
  args: {
    siteId: v.id("sites"),
    surface: v.union(v.literal("draft"), v.literal("published")),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { siteId, surface, query: rawQuery, limit }) => {
    const searchTerm = rawQuery.trim();
    if (!searchTerm) return [];
    const site = await ctx.db.get(siteId);
    if (!site) return [];

    let scopeId: string;
    let releaseId: Id<"siteReleases"> | undefined;
    if (surface === "draft") {
      if (!(await isOrganizationMember(ctx, site.organizationId))) return [];
      assertDraftReadable(site);
      scopeId = draftSearchScope(siteId);
    } else {
      const access = await resolvePublishedSiteAccess(ctx, site);
      if (!canRenderPublishedSite(access) || !site.liveReleaseId) return [];
      const release = await ctx.db.get(site.liveReleaseId);
      if (!release) return [];
      releaseId = site.liveReleaseId;
      scopeId = liveSearchScope(siteId);
    }

    const matches = await searchScope(
      ctx,
      scopeId,
      searchTerm,
      normalizeSearchLimit(limit),
    );
    const currentMatches = releaseId
      ? matches.filter(({ doc }) =>
          isPublishedSearchEntryForRelease(doc, releaseId),
        )
      : matches;
    const hydrated = await Promise.all(
      currentMatches.map(({ doc, match }) =>
        releaseId
          ? hydrateReleaseResult(ctx, releaseId, doc, match, searchTerm)
          : hydrateDraftResult(ctx, doc, match, searchTerm),
      ),
    );
    return hydrated.filter((result) => result !== null);
  },
});
