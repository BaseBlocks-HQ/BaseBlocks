import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalAction,
  type MutationCtx,
  internalMutation,
} from "./_generated/server";
import { buildFileUrl } from "./files";
import {
  buildFileSearchContent,
  fileSourceVersion,
} from "./model/fileExtraction";
import { buildReleaseChangeDetail } from "./model/releaseChangeDetails";
import {
  extractionIsPublishable,
  publicationFailureOutcome,
} from "./model/releaseState";
import {
  extractOpenEditorText,
  parseOpenEditorDocument,
} from "./pageContentFormat";

const PAGE_BATCH_SIZE = 6;
const FILE_BATCH_SIZE = 8;
const CHANGE_BATCH_SIZE = 8;
const METADATA_BATCH_SIZE = 40;
const CLEANUP_BATCH_SIZE = 50;
const STALLED_PUBLICATION_MS = 10 * 60_000;
const MAX_BUILD_ATTEMPTS = 3;

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

const publicationPhaseValidator = v.union(
  buildPhaseValidator,
  cleanupPhaseValidator,
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

type PublicationPhase = BuildPhase | CleanupPhase;

function cursorMatches(
  stored: string | undefined,
  received: string | undefined,
) {
  return (stored ?? null) === (received ?? null);
}

export function publicationBatchMatches(
  release: Pick<
    Doc<"siteReleases">,
    | "publicationToken"
    | "publicationPhase"
    | "publicationCursor"
    | "publicationAttempt"
    | "publicationStatus"
  > | null,
  args: {
    token: string;
    phase: PublicationPhase;
    cursor?: string;
    attempt: number;
  },
) {
  return Boolean(
    release &&
      release.publicationToken === args.token &&
      release.publicationPhase === args.phase &&
      cursorMatches(release.publicationCursor, args.cursor) &&
      (release.publicationAttempt ?? 0) === args.attempt &&
      (release.publicationStatus === "building" ||
        release.publicationStatus === "aborting" ||
        release.publicationStatus === "clearing"),
  );
}

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

async function scheduleBatch(
  ctx: MutationCtx,
  args: {
    releaseId: Id<"siteReleases">;
    token: string;
    phase: PublicationPhase;
    cursor?: string;
    attempt: number;
  },
  delay = 0,
) {
  await ctx.scheduler.runAfter(
    delay,
    internal.releasePublication.processBatch,
    args,
  );
}

async function moveToPhase(
  ctx: MutationCtx,
  release: Doc<"siteReleases">,
  token: string,
  phase: PublicationPhase,
) {
  const now = Date.now();
  await ctx.db.patch(release._id, {
    publicationPhase: phase,
    publicationCursor: undefined,
    publicationAttempt: 0,
    publicationUpdatedAt: now,
  });
  await scheduleBatch(ctx, {
    releaseId: release._id,
    token,
    phase,
    attempt: 0,
  });
}

async function beginAbort(
  ctx: MutationCtx,
  release: Doc<"siteReleases">,
  failure = "The draft changed before publication completed.",
) {
  if (release.publicationStatus === "aborting") return;
  const token = crypto.randomUUID();
  const phase: CleanupPhase = "cleanupPages";
  await ctx.db.patch(release._id, {
    publicationStatus: "aborting",
    publicationToken: token,
    publicationPhase: phase,
    publicationCursor: undefined,
    publicationAttempt: 0,
    publicationUpdatedAt: Date.now(),
    publicationFailure: failure,
  });
  await scheduleBatch(ctx, {
    releaseId: release._id,
    token,
    phase,
    attempt: 0,
  });
}

async function continuePagination(
  ctx: MutationCtx,
  release: Doc<"siteReleases">,
  token: string,
  phase: BuildPhase,
  result: { isDone: boolean; continueCursor: string },
  nextPhase: BuildPhase,
) {
  if (result.isDone) {
    await moveToPhase(ctx, release, token, nextPhase);
    return;
  }
  await ctx.db.patch(release._id, {
    publicationCursor: result.continueCursor,
    publicationAttempt: 0,
    publicationUpdatedAt: Date.now(),
  });
  await scheduleBatch(ctx, {
    releaseId: release._id,
    token,
    phase,
    cursor: result.continueCursor,
    attempt: 0,
  });
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
      updatedAt: Math.max(source.updatedAt, document?.updatedAt ?? 0),
    });
    const revision = document ? await ctx.db.get(document.revisionId) : null;
    const payload = revision ? await ctx.db.get(revision.payloadId) : null;
    const text = payload
      ? extractOpenEditorText(parseOpenEditorDocument(payload.content))
      : "";
    await ctx.db.insert("releaseSearchEntries", {
      releaseId: release._id,
      siteId: release.siteId,
      kind: "page",
      sourceId: source._id,
      title: source.title,
      text: text.trim(),
    });
    inserted += 1;
  }
  if (inserted > 0) {
    await ctx.db.patch(release._id, {
      pageCount: release.pageCount + inserted,
    });
  }
  await continuePagination(ctx, release, token, "pages", page, "libraries");
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
  await continuePagination(ctx, release, token, "libraries", page, "folders");
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
  await continuePagination(ctx, release, token, "folders", page, "files");
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
      await beginAbort(
        ctx,
        release,
        "Document extraction changed before publication completed.",
      );
      return;
    }
    await ctx.db.insert("releaseSearchEntries", {
      releaseId: release._id,
      siteId: release.siteId,
      kind: "file",
      sourceId: source._id,
      title: source.filename,
      text: buildFileSearchContent(
        extraction?.status === "ready" ? extraction.extractedText : undefined,
      ),
      fileMetadata: {
        fileId: source._id,
        filename: source.filename,
        fileContentType: source.contentType,
        size: source.size,
        libraryId: source.libraryId,
        downloadUrl: buildFileUrl(source._id),
      },
    });
  }
  await continuePagination(ctx, release, token, "files", page, "changes");
}

async function snapshotChanges(
  ctx: MutationCtx,
  release: Doc<"siteReleases">,
  token: string,
  cursor?: string,
) {
  const site = await ctx.db.get(release.siteId);
  if (!site) {
    await beginAbort(ctx, release);
    return;
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
      sourceUpdatedAt:
        source.draftRevision === undefined ? source.updatedAt : undefined,
      fields: detail.fields,
      content: detail.content,
    });
  }
  if (page.page.length > 0) {
    await ctx.db.patch(release._id, {
      changeCount: release.changeCount + page.page.length,
    });
  }
  await continuePagination(ctx, release, token, "changes", page, "activate");
}

async function activateRelease(ctx: MutationCtx, release: Doc<"siteReleases">) {
  const site = await ctx.db.get(release.siteId);
  if (
    !site ||
    (site.draftRevision ?? 0) !== release.sourceDraftRevision ||
    release.pageCount === 0 ||
    (await hasPendingFileExtraction(ctx, release.siteId))
  ) {
    await beginAbort(
      ctx,
      release,
      "The draft or document extraction changed before publication completed.",
    );
    return;
  }
  const now = Date.now();
  await ctx.db.patch(release._id, {
    publicationStatus: "clearing",
    publicationPhase: "clearDraftChanges",
    publicationCursor: undefined,
    publicationAttempt: 0,
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
  if (release.publicationToken) {
    await scheduleBatch(ctx, {
      releaseId: release._id,
      token: release.publicationToken,
      phase: "clearDraftChanges",
      attempt: 0,
    });
  }
}

export function draftChangeMatchesPublication(
  current: Pick<Doc<"draftChanges">, "_id" | "draftRevision" | "updatedAt">,
  snapshot: Pick<
    Doc<"releaseChanges">,
    "sourceDraftChangeId" | "sourceDraftRevision" | "sourceUpdatedAt"
  >,
) {
  if (
    !snapshot.sourceDraftChangeId ||
    current._id !== snapshot.sourceDraftChangeId
  ) {
    return false;
  }
  if (snapshot.sourceDraftRevision !== undefined) {
    return current.draftRevision === snapshot.sourceDraftRevision;
  }
  return (
    snapshot.sourceUpdatedAt !== undefined &&
    current.updatedAt === snapshot.sourceUpdatedAt
  );
}

async function clearPublishedDraftChanges(
  ctx: MutationCtx,
  release: Doc<"siteReleases">,
  token: string,
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
  if (!page.isDone) {
    await ctx.db.patch(release._id, {
      publicationCursor: page.continueCursor,
      publicationAttempt: 0,
      publicationUpdatedAt: Date.now(),
    });
    await scheduleBatch(ctx, {
      releaseId: release._id,
      token,
      phase: "clearDraftChanges",
      cursor: page.continueCursor,
      attempt: 0,
    });
    return;
  }
  await ctx.db.patch(release._id, {
    publicationStatus: "complete",
    publicationToken: undefined,
    publicationPhase: undefined,
    publicationCursor: undefined,
    publicationAttempt: undefined,
    publicationUpdatedAt: Date.now(),
  });
}

const cleanupTables = {
  cleanupPages: "releasePages",
  cleanupLibraries: "releaseLibraries",
  cleanupFolders: "releaseFolders",
  cleanupFiles: "releaseFiles",
  cleanupSearch: "releaseSearchEntries",
  cleanupChanges: "releaseChanges",
} as const;

const nextCleanupPhase: Record<CleanupPhase, CleanupPhase | null> = {
  cleanupPages: "cleanupLibraries",
  cleanupLibraries: "cleanupFolders",
  cleanupFolders: "cleanupFiles",
  cleanupFiles: "cleanupSearch",
  cleanupSearch: "cleanupChanges",
  cleanupChanges: null,
};

async function cleanupRelease(
  ctx: MutationCtx,
  release: Doc<"siteReleases">,
  token: string,
  phase: CleanupPhase,
) {
  const rows = await ctx.db
    .query(cleanupTables[phase])
    .withIndex("by_release", (q) => q.eq("releaseId", release._id))
    .take(CLEANUP_BATCH_SIZE);
  for (const row of rows) await ctx.db.delete(row._id);
  if (rows.length === CLEANUP_BATCH_SIZE) {
    await ctx.db.patch(release._id, {
      publicationAttempt: 0,
      publicationUpdatedAt: Date.now(),
    });
    await scheduleBatch(ctx, {
      releaseId: release._id,
      token,
      phase,
      attempt: 0,
    });
    return;
  }
  const next = nextCleanupPhase[phase];
  if (next) {
    await moveToPhase(ctx, release, token, next);
  } else {
    await ctx.db.patch(release._id, {
      publicationStatus: "failed",
      publicationToken: undefined,
      publicationPhase: undefined,
      publicationCursor: undefined,
      publicationAttempt: undefined,
      publicationUpdatedAt: Date.now(),
    });
  }
}

export const applyBatch = internalMutation({
  args: {
    releaseId: v.id("siteReleases"),
    token: v.string(),
    phase: publicationPhaseValidator,
    cursor: v.optional(v.string()),
    attempt: v.number(),
  },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);
    if (!release || !publicationBatchMatches(release, args)) {
      return { applied: false };
    }
    if (release.publicationStatus === "aborting") {
      if (!args.phase.startsWith("cleanup")) return { applied: false };
      await cleanupRelease(
        ctx,
        release,
        args.token,
        args.phase as CleanupPhase,
      );
      return { applied: true };
    }
    if (
      release.publicationStatus === "clearing" &&
      args.phase === "clearDraftChanges"
    ) {
      await clearPublishedDraftChanges(ctx, release, args.token, args.cursor);
      return { applied: true };
    }
    if (release.publicationStatus !== "building") {
      return { applied: false };
    }
    const site = await ctx.db.get(release.siteId);
    if (!site || (site.draftRevision ?? 0) !== release.sourceDraftRevision) {
      await beginAbort(ctx, release);
      return { applied: true };
    }

    switch (args.phase as BuildPhase) {
      case "pages":
        await snapshotPages(ctx, release, args.token, args.cursor);
        break;
      case "libraries":
        await snapshotLibraries(ctx, release, args.token, args.cursor);
        break;
      case "folders":
        await snapshotFolders(ctx, release, args.token, args.cursor);
        break;
      case "files":
        await snapshotFiles(ctx, release, args.token, args.cursor);
        break;
      case "changes":
        await snapshotChanges(ctx, release, args.token, args.cursor);
        break;
      case "activate":
        await activateRelease(ctx, release);
        break;
      case "clearDraftChanges":
        break;
    }
    return { applied: true };
  },
});

export function publicationRetryDelayMs(attempt: number): number {
  return Math.min(30_000, 1_000 * 2 ** Math.max(0, attempt));
}

function safePublicationFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replaceAll(/[\r\n\t]+/gu, " ").slice(0, 300);
}

export const handleBatchFailure = internalMutation({
  args: {
    releaseId: v.id("siteReleases"),
    token: v.string(),
    phase: publicationPhaseValidator,
    cursor: v.optional(v.string()),
    attempt: v.number(),
    failure: v.string(),
  },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);
    if (!release || !publicationBatchMatches(release, args)) {
      return { applied: false };
    }
    const nextAttempt = Math.max(0, Math.floor(args.attempt)) + 1;
    if (
      publicationFailureOutcome(
        release.publicationStatus,
        nextAttempt,
        MAX_BUILD_ATTEMPTS,
      ) === "abort"
    ) {
      await beginAbort(
        ctx,
        release,
        `Publication failed after ${MAX_BUILD_ATTEMPTS} attempts: ${args.failure}`,
      );
      return { applied: true, aborted: true };
    }
    await ctx.db.patch(release._id, {
      publicationAttempt: nextAttempt,
      publicationUpdatedAt: Date.now(),
    });
    await scheduleBatch(
      ctx,
      {
        releaseId: release._id,
        token: args.token,
        phase: args.phase,
        cursor: args.cursor,
        attempt: nextAttempt,
      },
      publicationRetryDelayMs(nextAttempt),
    );
    return { applied: true, aborted: false };
  },
});

export const processBatch: ReturnType<typeof internalAction> = internalAction({
  args: {
    releaseId: v.id("siteReleases"),
    token: v.string(),
    phase: publicationPhaseValidator,
    cursor: v.optional(v.string()),
    attempt: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ applied: boolean; aborted?: boolean }> => {
    try {
      return await ctx.runMutation(internal.releasePublication.applyBatch, {
        releaseId: args.releaseId,
        token: args.token,
        phase: args.phase,
        cursor: args.cursor,
        attempt: args.attempt ?? 0,
      });
    } catch (error) {
      return await ctx.runMutation(
        internal.releasePublication.handleBatchFailure,
        {
          ...args,
          attempt: args.attempt ?? 0,
          failure: safePublicationFailure(error),
        },
      );
    }
  },
});

export const recoverStalled = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - STALLED_PUBLICATION_MS;
    const [building, aborting, clearing] = await Promise.all([
      ctx.db
        .query("siteReleases")
        .withIndex("by_publication_status_updated", (q) =>
          q
            .eq("publicationStatus", "building")
            .lt("publicationUpdatedAt", cutoff),
        )
        .take(10),
      ctx.db
        .query("siteReleases")
        .withIndex("by_publication_status_updated", (q) =>
          q
            .eq("publicationStatus", "aborting")
            .lt("publicationUpdatedAt", cutoff),
        )
        .take(10),
      ctx.db
        .query("siteReleases")
        .withIndex("by_publication_status_updated", (q) =>
          q
            .eq("publicationStatus", "clearing")
            .lt("publicationUpdatedAt", cutoff),
        )
        .take(10),
    ]);
    for (const release of [...building, ...aborting, ...clearing]) {
      if (!release.publicationToken || !release.publicationPhase) continue;
      await ctx.db.patch(release._id, { publicationUpdatedAt: Date.now() });
      await scheduleBatch(ctx, {
        releaseId: release._id,
        token: release.publicationToken,
        phase: release.publicationPhase,
        cursor: release.publicationCursor,
        attempt: release.publicationAttempt ?? 0,
      });
    }
    return {
      recovered: building.length + aborting.length + clearing.length,
    };
  },
});
