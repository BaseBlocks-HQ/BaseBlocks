import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { buildReleaseChangeDetail } from "./model/releaseChangeDetails";
import { fileSourceVersion } from "./model/fileExtraction";
import { readContentRevisionSearchText } from "./model/contentObjects";
import {
  extractionIsPublishable,
  isReleaseAvailable,
} from "./model/releaseState";
import {
  extractOpenEditorText,
  parseOpenEditorDocument,
} from "./pageContentFormat";
import { upsertSearchEntry } from "./search";

/**
 * A release manifest freezes mutable metadata and the immutable search text
 * needed by the live projection. Page content rows reference immutable
 * content revisions; file text is captured on the release file row.
 */
const DESCRIPTION_MAX_CHARS = 280;
const LIVE_SEARCH_BATCH_SIZE = 8;

const liveSearchProjectionPhase = v.union(
  v.literal("clear"),
  v.literal("pages"),
  v.literal("files"),
);

type LiveSearchProjectionPhase = "clear" | "pages" | "files";

async function readPublishablePageText(
  ctx: MutationCtx,
  siteId: Doc<"sites">["_id"],
  document: Doc<"pageDocuments"> | null,
): Promise<string> {
  if (!document) return "";
  if (document.siteId !== siteId) {
    throw new Error("Page content belongs to another site");
  }
  const revision = await ctx.db.get(document.revisionId);
  if (!revision || revision.siteId !== siteId) {
    throw new Error("Page content revision is missing");
  }
  // New revisions already carry their denormalized text. Avoid loading the
  // potentially large payload in the publish transaction just to derive the
  // bounded description below.
  if (revision.searchText !== undefined) return revision.searchText;
  const payload = await ctx.db.get(revision.payloadId);
  if (!payload || payload.siteId !== siteId) {
    throw new Error("Page content payload is missing");
  }
  // Parse legacy revisions once so malformed content cannot become the live
  // release.
  return extractOpenEditorText(parseOpenEditorDocument(payload.content));
}

export function truncateDescription(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length <= DESCRIPTION_MAX_CHARS
    ? trimmed
    : `${trimmed.slice(0, DESCRIPTION_MAX_CHARS - 1)}…`;
}

export async function snapshotPages(
  ctx: MutationCtx,
  releaseId: Doc<"siteReleases">["_id"],
  siteId: Doc<"sites">["_id"],
): Promise<number> {
  const documents = await ctx.db
    .query("pageDocuments")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .collect();
  const documentsByPageId = new Map<string, Doc<"pageDocuments">[]>();
  for (const document of documents) {
    const rows = documentsByPageId.get(document.pageId) ?? [];
    rows.push(document);
    documentsByPageId.set(document.pageId, rows);
  }

  let inserted = 0;
  for await (const source of ctx.db
    .query("pages")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))) {
    if (source.deletedAt !== undefined) continue;
    const documentRows = documentsByPageId.get(source._id) ?? [];
    if (documentRows.length > 1) {
      throw new Error("A page has multiple content documents");
    }
    const document = documentRows[0] ?? null;
    await ctx.db.insert("releasePages", {
      releaseId,
      siteId,
      pageId: source._id,
      parentId: source.parentId,
      title: source.title,
      slug: source.slug,
      icon: source.icon,
      order: source.order,
      contentRevisionId: document?.revisionId,
      contentHash: document?.contentHash,
      description: truncateDescription(
        await readPublishablePageText(ctx, siteId, document),
      ),
      updatedAt: Math.max(source.updatedAt, document?.updatedAt ?? 0),
    });
    inserted += 1;
  }
  return inserted;
}

export async function snapshotLibraries(
  ctx: MutationCtx,
  releaseId: Doc<"siteReleases">["_id"],
  siteId: Doc<"sites">["_id"],
): Promise<void> {
  for await (const source of ctx.db
    .query("documentLibraries")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))) {
    if (source.deletedAt !== undefined) continue;
    await ctx.db.insert("releaseLibraries", {
      releaseId,
      siteId,
      libraryId: source._id,
      name: source.name,
    });
  }
}

export async function snapshotFolders(
  ctx: MutationCtx,
  releaseId: Doc<"siteReleases">["_id"],
  siteId: Doc<"sites">["_id"],
): Promise<void> {
  for await (const source of ctx.db
    .query("documentFolders")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))) {
    if (source.deletedAt !== undefined) continue;
    const library = await ctx.db.get(source.libraryId);
    if (!library || library.deletedAt !== undefined) continue;
    await ctx.db.insert("releaseFolders", {
      releaseId,
      siteId,
      libraryId: source.libraryId,
      folderId: source._id,
      parentId: source.parentId,
      name: source.name,
      order: source.order,
    });
  }
}

/**
 * Resolves all file references from the current draft once. Calling the
 * per-asset helper inside the publication loop rescans every page document for
 * every site asset and can exceed Convex's transaction range limit.
 */
export async function getDraftReferencedFileIds(
  ctx: MutationCtx,
  site: Pick<Doc<"sites">, "_id" | "logoFileId" | "faviconFileId">,
): Promise<Set<Doc<"files">["_id"]>> {
  const referenced = new Set<Doc<"files">["_id"]>();
  if (site.logoFileId) referenced.add(site.logoFileId);
  if (site.faviconFileId) referenced.add(site.faviconFileId);

  const activePageIds = new Set<Doc<"pages">["_id"]>();
  for await (const page of ctx.db
    .query("pages")
    .withIndex("by_site", (q) => q.eq("siteId", site._id))) {
    if (page.deletedAt === undefined) activePageIds.add(page._id);
  }

  const documents = await ctx.db
    .query("pageDocuments")
    .withIndex("by_site", (q) => q.eq("siteId", site._id))
    .collect();
  for (const document of documents) {
    if (!activePageIds.has(document.pageId)) continue;
    const revision = await ctx.db.get(document.revisionId);
    if (!revision || revision.siteId !== site._id) continue;
    for (const fileId of revision.fileIds) referenced.add(fileId);
  }
  return referenced;
}

export async function snapshotFiles(
  ctx: MutationCtx,
  releaseId: Doc<"siteReleases">["_id"],
  siteId: Doc<"sites">["_id"],
  site?: Pick<Doc<"sites">, "_id" | "logoFileId" | "faviconFileId">,
): Promise<void> {
  const referencedFileIds = await getDraftReferencedFileIds(
    ctx,
    site ?? (await ctx.db.get(siteId)) ?? { _id: siteId },
  );
  const extractions = await ctx.db
    .query("fileExtractions")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .collect();
  const extractionsByFileId = new Map<string, Doc<"fileExtractions">[]>();
  for (const extraction of extractions) {
    const rows = extractionsByFileId.get(extraction.fileId) ?? [];
    rows.push(extraction);
    extractionsByFileId.set(extraction.fileId, rows);
  }

  for await (const source of ctx.db
    .query("files")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))) {
    if (source.deletedAt !== undefined) continue;
    if (source.kind === "siteAsset" && !referencedFileIds.has(source._id)) {
      continue;
    }
    let extraction: Doc<"fileExtractions"> | null = null;
    if (source.kind === "file") {
      const extractionRows = extractionsByFileId.get(source._id) ?? [];
      if (extractionRows.length > 1) {
        throw new Error("A file has multiple document extractions");
      }
      extraction = extractionRows[0] ?? null;
      if (!extractionIsPublishable(extraction, fileSourceVersion(source))) {
        throw new Error(
          "Document extraction changed before publication completed.",
        );
      }
    }
    await ctx.db.insert("releaseFiles", {
      releaseId,
      siteId,
      fileId: source._id,
      kind: source.kind,
      objectKey: source.objectKey,
      filename: source.filename,
      contentType: source.contentType,
      size: source.size,
      checksum: source.checksum,
      libraryId: source.libraryId,
      folderId: source.folderId,
      order: source.order,
      uploadedBy: source.uploadedBy,
      createdAt: source.createdAt,
      ...(source.kind === "file"
        ? {
            extractedText:
              extraction?.status === "ready" &&
              extraction.sourceVersion === fileSourceVersion(source)
                ? (extraction.extractedText ?? "")
                : "",
          }
        : {}),
    });
  }
}

/**
 * Copies the current draft changes into the release. Must run before
 * activation: detail diffs read the draft state and the previous base
 * release.
 */
export async function snapshotChanges(
  ctx: MutationCtx,
  site: Doc<"sites">,
  releaseId: Doc<"siteReleases">["_id"],
): Promise<number> {
  let inserted = 0;
  for await (const source of ctx.db
    .query("draftChanges")
    .withIndex("by_site", (q) => q.eq("siteId", site._id))) {
    const detail = await buildReleaseChangeDetail(ctx, site, source);
    await ctx.db.insert("releaseChanges", {
      releaseId,
      entityType: source.entityType,
      entityId: source.entityId,
      changeType: source.changeType,
      label: source.label,
      details: source.details,
      sourceDraftChangeId: source._id,
      sourceDraftRevision: source.draftRevision,
      fields: detail.fields,
      content: detail.content,
    });
    inserted += 1;
  }
  return inserted;
}

export async function clearPublishedDraftChanges(
  ctx: MutationCtx,
  siteId: Doc<"sites">["_id"],
): Promise<void> {
  const changes = await ctx.db
    .query("draftChanges")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .collect();
  for (const change of changes) {
    await ctx.db.delete(change._id);
  }
}

async function readReleasedFileText(
  ctx: MutationCtx,
  row: Doc<"releaseFiles">,
): Promise<string> {
  if (row.extractedText !== undefined) return row.extractedText;

  // Releases created before `releaseFiles.extractedText` was added need a
  // guarded compatibility fallback. Never use an extraction for a different
  // file source; doing so would make historical releases search current draft
  // content.
  const file = await ctx.db.get(row.fileId);
  if (
    file?.kind !== "file" ||
    file.deletedAt !== undefined ||
    file.objectKey !== row.objectKey ||
    file.size !== row.size ||
    file.checksum !== row.checksum
  ) {
    return "";
  }

  const extraction = await ctx.db
    .query("fileExtractions")
    .withIndex("by_file", (q) => q.eq("fileId", row.fileId))
    .unique();
  return extraction?.status === "ready" &&
    extraction.sourceVersion === fileSourceVersion(file)
    ? (extraction.extractedText ?? "")
    : "";
}

async function scheduleLiveSearchBatch(
  ctx: Pick<MutationCtx, "scheduler">,
  args: {
    siteId: Doc<"sites">["_id"];
    expectedLiveReleaseId: Doc<"siteReleases">["_id"] | undefined;
    expectedLiveSearchProjectionGeneration: number | undefined;
    phase: LiveSearchProjectionPhase;
    cursor?: string;
  },
) {
  await ctx.scheduler.runAfter(
    0,
    internal.publication.projectLiveSearchBatch,
    args,
  );
}

/**
 * Starts a bounded rebuild of the `live:${siteId}` search scope. Runs as a
 * derived projection after activation; never blocks publishing. The expected
 * release id fences the run: if the live pointer moved on, a newer projection
 * supersedes this one.
 */
export const projectLiveSearch = internalMutation({
  args: {
    siteId: v.id("sites"),
    expectedLiveReleaseId: v.optional(v.id("siteReleases")),
    expectedLiveSearchProjectionGeneration: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (
    ctx,
    { siteId, expectedLiveReleaseId, expectedLiveSearchProjectionGeneration },
  ) => {
    await scheduleLiveSearchBatch(ctx, {
      siteId,
      expectedLiveReleaseId,
      expectedLiveSearchProjectionGeneration,
      phase: "clear",
    });
    return null;
  },
});

/** Processes one bounded portion of a live search projection. */
export const projectLiveSearchBatch = internalMutation({
  args: {
    siteId: v.id("sites"),
    expectedLiveReleaseId: v.optional(v.id("siteReleases")),
    expectedLiveSearchProjectionGeneration: v.optional(v.number()),
    phase: liveSearchProjectionPhase,
    cursor: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (
    ctx,
    {
      siteId,
      expectedLiveReleaseId,
      expectedLiveSearchProjectionGeneration,
      phase,
      cursor,
    },
  ) => {
    const site = await ctx.db.get(siteId);
    if (
      !site ||
      site.liveReleaseId !== expectedLiveReleaseId ||
      (expectedLiveSearchProjectionGeneration !== undefined &&
        site.liveSearchProjectionGeneration !==
          expectedLiveSearchProjectionGeneration)
    ) {
      return null;
    }

    const scopeId = `live:${siteId}`;
    if (phase === "clear") {
      const page = await ctx.db
        .query("searchEntries")
        .withIndex("by_scope", (q) => q.eq("scopeId", scopeId))
        .paginate({ cursor: cursor ?? null, numItems: LIVE_SEARCH_BATCH_SIZE });
      for (const entry of page.page) {
        if (entry.siteId === siteId) await ctx.db.delete(entry._id);
      }
      if (!page.isDone) {
        await scheduleLiveSearchBatch(ctx, {
          siteId,
          expectedLiveReleaseId,
          expectedLiveSearchProjectionGeneration,
          phase,
          cursor: page.continueCursor,
        });
        return null;
      }
      if (!expectedLiveReleaseId) return null;
      const release = await ctx.db.get(expectedLiveReleaseId);
      if (
        !release ||
        release.siteId !== siteId ||
        !isReleaseAvailable(release)
      ) {
        return null;
      }
      await scheduleLiveSearchBatch(ctx, {
        siteId,
        expectedLiveReleaseId,
        expectedLiveSearchProjectionGeneration,
        phase: "pages",
      });
      return null;
    }

    if (!expectedLiveReleaseId) return null;
    const release = await ctx.db.get(expectedLiveReleaseId);
    if (!release || release.siteId !== siteId || !isReleaseAvailable(release)) {
      return null;
    }

    if (phase === "pages") {
      const page = await ctx.db
        .query("releasePages")
        .withIndex("by_release", (q) => q.eq("releaseId", release._id))
        .paginate({ cursor: cursor ?? null, numItems: LIVE_SEARCH_BATCH_SIZE });
      for (const row of page.page) {
        await upsertSearchEntry(ctx, {
          siteId,
          scopeId,
          releaseId: release._id,
          kind: "page",
          sourceId: row.pageId,
          title: row.title,
          text: await readContentRevisionSearchText(ctx, row.contentRevisionId),
        });
      }
      await scheduleLiveSearchBatch(ctx, {
        siteId,
        expectedLiveReleaseId,
        expectedLiveSearchProjectionGeneration,
        phase: page.isDone ? "files" : phase,
        cursor: page.isDone ? undefined : page.continueCursor,
      });
      return null;
    }

    const page = await ctx.db
      .query("releaseFiles")
      .withIndex("by_release", (q) => q.eq("releaseId", release._id))
      .paginate({ cursor: cursor ?? null, numItems: LIVE_SEARCH_BATCH_SIZE });
    for (const row of page.page) {
      if (row.kind !== "file") continue;
      await upsertSearchEntry(ctx, {
        siteId,
        scopeId,
        releaseId: release._id,
        kind: "file",
        sourceId: row.fileId,
        title: row.filename,
        text: await readReleasedFileText(ctx, row),
      });
    }
    if (!page.isDone) {
      await scheduleLiveSearchBatch(ctx, {
        siteId,
        expectedLiveReleaseId,
        expectedLiveSearchProjectionGeneration,
        phase,
        cursor: page.continueCursor,
      });
    }
    return null;
  },
});
