import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, internalMutation } from "./_generated/server";
import { workflows } from "./workflows";
import { fileSourceVersion } from "./model/fileExtraction";
import { buildReleaseChangeDetail } from "./model/releaseChangeDetails";
import { extractionIsPublishable } from "./model/releaseState";
import { isSiteAssetReferencedByDraft } from "./model/siteAssets";
import {
  extractOpenEditorText,
  parseOpenEditorDocument,
} from "./pageContentFormat";
import { releaseSearchScope, upsertSearchEntry } from "./search";

const PAGE_BATCH_SIZE = 6;
const FILE_BATCH_SIZE = 8;
const CHANGE_BATCH_SIZE = 8;
const METADATA_BATCH_SIZE = 40;
const CLEANUP_BATCH_SIZE = 50;

const buildPhaseValidator = v.union(
  v.literal("pages"),
  v.literal("libraries"),
  v.literal("folders"),
  v.literal("files"),
  v.literal("changes"),
  v.literal("activate"),
  v.literal("clearDraftChanges"),
);

const cleanupPhaseValidator = v.union(
  v.literal("cleanupPages"),
  v.literal("cleanupLibraries"),
  v.literal("cleanupFolders"),
  v.literal("cleanupFiles"),
  v.literal("cleanupSearch"),
  v.literal("cleanupChanges"),
);

type BuildPhase =
  | "pages"
  | "libraries"
  | "folders"
  | "files"
  | "changes"
  | "activate"
  | "clearDraftChanges";

type CleanupPhase =
  | "cleanupPages"
  | "cleanupLibraries"
  | "cleanupFolders"
  | "cleanupFiles"
  | "cleanupSearch"
  | "cleanupChanges";

async function hasPendingFileExtraction(
  ctx: MutationCtx,
  siteId: Id<"sites">,
): Promise<boolean> {
  const [queued, processing] = await Promise.all([
    ctx.db
      .query("fileExtractions")
      .withIndex("by_site_status", (q) =>
        q.eq("siteId", siteId).eq("status", "queued"),
      )
      .first(),
    ctx.db
      .query("fileExtractions")
      .withIndex("by_site_status", (q) =>
        q.eq("siteId", siteId).eq("status", "processing"),
      )
      .first(),
  ]);
  return Boolean(queued || processing);
}

async function continuePagination(
  _ctx: MutationCtx,
  _release: Doc<"siteReleases">,
  _token: string,
  _phase: BuildPhase,
  result: { isDone: boolean; continueCursor: string },
  _nextPhase: BuildPhase,
) {
  return result;
}

async function snapshotPages(
  ctx: MutationCtx,
  release: Doc<"siteReleases">,
  token: string,
  cursor?: string,
) {
  const page = await ctx.db
    .query("pages")
    .withIndex("by_site", (q) => q.eq("siteId", release.siteId))
    .paginate({ cursor: cursor ?? null, numItems: PAGE_BATCH_SIZE });
  let inserted = 0;
  for (const source of page.page) {
    if (source.deletedAt !== undefined) continue;
    const document = await ctx.db
      .query("pageDocuments")
      .withIndex("by_page", (q) => q.eq("pageId", source._id))
      .unique();
    const revision = document ? await ctx.db.get(document.revisionId) : null;
    const payload = revision ? await ctx.db.get(revision.payloadId) : null;
    const text = payload
      ? extractOpenEditorText(parseOpenEditorDocument(payload.content)).trim()
      : "";
    await ctx.db.insert("releasePages", {
      releaseId: release._id,
      siteId: release.siteId,
      pageId: source._id,
      parentId: source.parentId,
      title: source.title,
      slug: source.slug,
      icon: source.icon,
      order: source.order,
      contentRevisionId: document?.revisionId,
      contentHash: document?.contentHash,
      descriptionText: text,
      updatedAt: Math.max(source.updatedAt, document?.updatedAt ?? 0),
    });
    await upsertSearchEntry(ctx, {
      siteId: release.siteId,
      scopeId: releaseSearchScope(release._id),
      kind: "page",
      sourceId: source._id,
      title: source.title,
      text,
    });
    inserted += 1;
  }
  if (inserted > 0) {
    await ctx.db.patch(release._id, {
      pageCount: release.pageCount + inserted,
    });
  }
  return continuePagination(ctx, release, token, "pages", page, "libraries");
}

async function snapshotLibraries(
  ctx: MutationCtx,
  release: Doc<"siteReleases">,
  token: string,
  cursor?: string,
) {
  const page = await ctx.db
    .query("documentLibraries")
    .withIndex("by_site", (q) => q.eq("siteId", release.siteId))
    .paginate({ cursor: cursor ?? null, numItems: METADATA_BATCH_SIZE });
  for (const source of page.page) {
    if (source.deletedAt !== undefined) continue;
    await ctx.db.insert("releaseLibraries", {
      releaseId: release._id,
      siteId: release.siteId,
      libraryId: source._id,
      name: source.name,
    });
  }
  return continuePagination(ctx, release, token, "libraries", page, "folders");
}

async function snapshotFolders(
  ctx: MutationCtx,
  release: Doc<"siteReleases">,
  token: string,
  cursor?: string,
) {
  const page = await ctx.db
    .query("documentFolders")
    .withIndex("by_site", (q) => q.eq("siteId", release.siteId))
    .paginate({ cursor: cursor ?? null, numItems: METADATA_BATCH_SIZE });
  for (const source of page.page) {
    if (source.deletedAt !== undefined) continue;
    const library = await ctx.db.get(source.libraryId);
    if (!library || library.deletedAt !== undefined) continue;
    await ctx.db.insert("releaseFolders", {
      releaseId: release._id,
      siteId: release.siteId,
      libraryId: source.libraryId,
      folderId: source._id,
      parentId: source.parentId,
      name: source.name,
      order: source.order,
    });
  }
  return continuePagination(ctx, release, token, "folders", page, "files");
}

async function snapshotFiles(
  ctx: MutationCtx,
  release: Doc<"siteReleases">,
  token: string,
  cursor?: string,
) {
  const page = await ctx.db
    .query("files")
    .withIndex("by_site", (q) => q.eq("siteId", release.siteId))
    .paginate({ cursor: cursor ?? null, numItems: FILE_BATCH_SIZE });
  for (const source of page.page) {
    if (source.deletedAt !== undefined) continue;
    if (
      source.kind === "siteAsset" &&
      !(await isSiteAssetReferencedByDraft(ctx, source))
    ) {
      continue;
    }
    await ctx.db.insert("releaseFiles", {
      releaseId: release._id,
      siteId: release.siteId,
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
    });
    if (source.kind !== "file") continue;
    const extraction = await ctx.db
      .query("fileExtractions")
      .withIndex("by_file", (q) => q.eq("fileId", source._id))
      .unique();
    if (!extractionIsPublishable(extraction, fileSourceVersion(source))) {
      throw new Error(
        "Document extraction changed before publication completed.",
      );
    }
    await upsertSearchEntry(ctx, {
      siteId: release.siteId,
      scopeId: releaseSearchScope(release._id),
      kind: "file",
      sourceId: source._id,
      title: source.filename,
      text:
        extraction?.status === "ready" ? (extraction.extractedText ?? "") : "",
    });
  }
  return continuePagination(ctx, release, token, "files", page, "changes");
}

async function snapshotChanges(
  ctx: MutationCtx,
  release: Doc<"siteReleases">,
  token: string,
  cursor?: string,
) {
  const site = await ctx.db.get(release.siteId);
  if (!site) {
    throw new Error("The draft changed before publication completed.");
  }
  const page = await ctx.db
    .query("draftChanges")
    .withIndex("by_site", (q) => q.eq("siteId", release.siteId))
    .paginate({ cursor: cursor ?? null, numItems: CHANGE_BATCH_SIZE });
  for (const source of page.page) {
    const detail = await buildReleaseChangeDetail(ctx, site, source);
    await ctx.db.insert("releaseChanges", {
      releaseId: release._id,
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
  }
  if (page.page.length > 0) {
    await ctx.db.patch(release._id, {
      changeCount: release.changeCount + page.page.length,
    });
  }
  return continuePagination(ctx, release, token, "changes", page, "activate");
}

async function activateRelease(ctx: MutationCtx, release: Doc<"siteReleases">) {
  const site = await ctx.db.get(release.siteId);
  if (
    !site ||
    site.draftRevision !== release.sourceDraftRevision ||
    release.pageCount === 0 ||
    (await hasPendingFileExtraction(ctx, release.siteId))
  ) {
    throw new Error(
      "The draft or document extraction changed before publication completed.",
    );
  }
  const now = Date.now();
  await ctx.db.patch(release._id, {
    publicationStatus: "clearing",
    publicationUpdatedAt: now,
  });
  await ctx.db.patch(site._id, {
    liveReleaseId: release._id,
    draftBaseReleaseId: release._id,
    updatedAt: now,
  });
  await ctx.db.insert("publicationEvents", {
    siteId: site._id,
    action: site.liveReleaseId ? "update" : "publish",
    fromReleaseId: site.liveReleaseId,
    toReleaseId: release._id,
    actorId: release.createdBy,
    createdAt: now,
  });
}

export function draftChangeMatchesPublication(
  current: Pick<Doc<"draftChanges">, "_id" | "draftRevision" | "updatedAt">,
  snapshot: Pick<
    Doc<"releaseChanges">,
    "sourceDraftChangeId" | "sourceDraftRevision"
  >,
) {
  if (
    !snapshot.sourceDraftChangeId ||
    current._id !== snapshot.sourceDraftChangeId
  ) {
    return false;
  }
  return (
    snapshot.sourceDraftRevision !== undefined &&
    current.draftRevision === snapshot.sourceDraftRevision
  );
}

async function clearPublishedDraftChanges(
  ctx: MutationCtx,
  release: Doc<"siteReleases">,
  cursor?: string,
) {
  const page = await ctx.db
    .query("releaseChanges")
    .withIndex("by_release", (q) => q.eq("releaseId", release._id))
    .paginate({ cursor: cursor ?? null, numItems: METADATA_BATCH_SIZE });
  for (const snapshot of page.page) {
    if (!snapshot.sourceDraftChangeId) continue;
    const current = await ctx.db.get(snapshot.sourceDraftChangeId);
    if (
      current?.siteId === release.siteId &&
      draftChangeMatchesPublication(current, snapshot)
    ) {
      await ctx.db.delete(current._id);
    }
  }
  return page;
}

const cleanupTables = {
  cleanupPages: "releasePages",
  cleanupLibraries: "releaseLibraries",
  cleanupFolders: "releaseFolders",
  cleanupFiles: "releaseFiles",
  cleanupChanges: "releaseChanges",
} as const;

const cleanupPhases: CleanupPhase[] = [
  "cleanupPages",
  "cleanupLibraries",
  "cleanupFolders",
  "cleanupFiles",
  "cleanupSearch",
  "cleanupChanges",
];

async function cleanupRelease(
  ctx: MutationCtx,
  release: Doc<"siteReleases">,
  phase: CleanupPhase,
) {
  if (phase === "cleanupSearch") {
    const rows = await ctx.db
      .query("searchEntries")
      .withIndex("by_scope", (q) =>
        q.eq("scopeId", releaseSearchScope(release._id)),
      )
      .take(CLEANUP_BATCH_SIZE);
    for (const row of rows) await ctx.db.delete(row._id);
    return rows.length < CLEANUP_BATCH_SIZE;
  }
  const rows = await ctx.db
    .query(cleanupTables[phase])
    .withIndex("by_release", (q) => q.eq("releaseId", release._id))
    .take(CLEANUP_BATCH_SIZE);
  for (const row of rows) await ctx.db.delete(row._id);
  return rows.length < CLEANUP_BATCH_SIZE;
}

export const applyBatch = internalMutation({
  args: {
    releaseId: v.id("siteReleases"),
    phase: buildPhaseValidator,
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);
    if (release?.publicationStatus !== "building") return null;
    const site = await ctx.db.get(release.siteId);
    if (!site || site.draftRevision !== release.sourceDraftRevision) {
      throw new Error("The draft changed before publication completed.");
    }

    switch (args.phase as BuildPhase) {
      case "pages":
        return snapshotPages(ctx, release, "", args.cursor);
      case "libraries":
        return snapshotLibraries(ctx, release, "", args.cursor);
      case "folders":
        return snapshotFolders(ctx, release, "", args.cursor);
      case "files":
        return snapshotFiles(ctx, release, "", args.cursor);
      case "changes":
        return snapshotChanges(ctx, release, "", args.cursor);
      case "activate":
        return null;
      case "clearDraftChanges":
        return null;
    }
  },
});

export const activate = internalMutation({
  args: { releaseId: v.id("siteReleases") },
  handler: async (ctx, { releaseId }) => {
    const release = await ctx.db.get(releaseId);
    if (release?.publicationStatus !== "building") return;
    await activateRelease(ctx, release);
  },
});

export const clearChangesBatch = internalMutation({
  args: { releaseId: v.id("siteReleases"), cursor: v.optional(v.string()) },
  handler: async (ctx, { releaseId, cursor }) => {
    const release = await ctx.db.get(releaseId);
    if (release?.publicationStatus !== "clearing") return null;
    return clearPublishedDraftChanges(ctx, release, cursor);
  },
});

export const finish = internalMutation({
  args: { releaseId: v.id("siteReleases") },
  handler: async (ctx, { releaseId }) => {
    await ctx.db.patch(releaseId, {
      publicationStatus: "complete",
      publicationFailure: undefined,
      publicationUpdatedAt: Date.now(),
    });
  },
});

export const cleanupBatch = internalMutation({
  args: { releaseId: v.id("siteReleases"), phase: cleanupPhaseValidator },
  handler: async (ctx, { releaseId, phase }) => {
    const release = await ctx.db.get(releaseId);
    return release ? cleanupRelease(ctx, release, phase) : true;
  },
});

export const fail = internalMutation({
  args: { releaseId: v.id("siteReleases"), failure: v.string() },
  handler: async (ctx, { releaseId, failure }) => {
    await ctx.db.patch(releaseId, {
      publicationStatus: "failed",
      publicationFailure: failure.replaceAll(/[\r\n\t]+/gu, " ").slice(0, 300),
      publicationUpdatedAt: Date.now(),
    });
  },
});

export const recordFailure = internalMutation({
  args: { releaseId: v.id("siteReleases"), failure: v.string() },
  handler: async (ctx, { releaseId, failure }) => {
    await ctx.db.patch(releaseId, {
      publicationFailure: failure.replaceAll(/[\r\n\t]+/gu, " ").slice(0, 300),
      publicationUpdatedAt: Date.now(),
    });
  },
});

export const run = workflows
  .define({ args: { releaseId: v.id("siteReleases") } })
  .handler(async (step, { releaseId }): Promise<void> => {
    let activated = false;
    try {
      for (const phase of [
        "pages",
        "libraries",
        "folders",
        "files",
        "changes",
      ] as const) {
        let cursor: string | undefined;
        do {
          const page: { isDone: boolean; continueCursor: string } | null =
            await step.runMutation(internal.releasePublication.applyBatch, {
              releaseId,
              phase,
              cursor,
            });
          if (!page) return;
          cursor = page.isDone ? undefined : page.continueCursor;
        } while (cursor);
      }
      await step.runMutation(internal.releasePublication.activate, {
        releaseId,
      });
      activated = true;
      let cursor: string | undefined;
      do {
        const page: { isDone: boolean; continueCursor: string } | null =
          await step.runMutation(
            internal.releasePublication.clearChangesBatch,
            {
              releaseId,
              cursor,
            },
          );
        if (!page) return;
        cursor = page.isDone ? undefined : page.continueCursor;
      } while (cursor);
      await step.runMutation(internal.releasePublication.finish, { releaseId });
    } catch (error) {
      const failure = error instanceof Error ? error.message : String(error);
      if (!activated) {
        for (const phase of cleanupPhases) {
          let done = false;
          while (!done) {
            done = await step.runMutation(
              internal.releasePublication.cleanupBatch,
              { releaseId, phase },
            );
          }
        }
        await step.runMutation(internal.releasePublication.fail, {
          releaseId,
          failure,
        });
        return;
      }
      await step.runMutation(internal.releasePublication.recordFailure, {
        releaseId,
        failure,
      });
      throw error;
    }
  });
