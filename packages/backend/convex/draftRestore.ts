import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  type MutationCtx,
} from "./_generated/server";
import { deleteFileRows } from "./files";
import { reconcileRestoredFile } from "./fileExtraction";
import { removePageContentIndex, indexPageContent } from "./search";
import { synchronizeParentDocument } from "./model/pageHierarchy";
import { parseOpenEditorDocument } from "./pageContentFormat";

const SMALL_BATCH = 6;
const METADATA_BATCH = 20;
const MAX_ATTEMPTS = 5;
const STALLED_RESTORE_MS = 10 * 60_000;

const phaseValidator = v.union(
  v.literal("validatePages"),
  v.literal("validateLibraries"),
  v.literal("validateFolders"),
  v.literal("validateFiles"),
  v.literal("archivePages"),
  v.literal("restorePages"),
  v.literal("archiveLibraries"),
  v.literal("restoreLibraries"),
  v.literal("archiveFolders"),
  v.literal("restoreFolders"),
  v.literal("archiveFiles"),
  v.literal("restoreFiles"),
  v.literal("synchronizeParents"),
  v.literal("clearDraftChanges"),
  v.literal("activate"),
);

type RestorePhase =
  | "validatePages"
  | "validateLibraries"
  | "validateFolders"
  | "validateFiles"
  | "archivePages"
  | "restorePages"
  | "archiveLibraries"
  | "restoreLibraries"
  | "archiveFolders"
  | "restoreFolders"
  | "archiveFiles"
  | "restoreFiles"
  | "synchronizeParents"
  | "clearDraftChanges"
  | "activate";

export const nextDraftRestorePhase: Record<RestorePhase, RestorePhase | null> =
  {
    validatePages: "validateLibraries",
    validateLibraries: "validateFolders",
    validateFolders: "validateFiles",
    validateFiles: "archivePages",
    archivePages: "restorePages",
    restorePages: "archiveLibraries",
    archiveLibraries: "restoreLibraries",
    restoreLibraries: "archiveFolders",
    archiveFolders: "restoreFolders",
    restoreFolders: "archiveFiles",
    archiveFiles: "restoreFiles",
    restoreFiles: "synchronizeParents",
    synchronizeParents: "clearDraftChanges",
    clearDraftChanges: "activate",
    activate: null,
  };

function cursorMatches(stored?: string, received?: string) {
  return (stored ?? null) === (received ?? null);
}

async function schedule(
  ctx: MutationCtx,
  restore: Doc<"draftRestores">,
  delay = 0,
) {
  await ctx.scheduler.runAfter(delay, internal.draftRestore.processBatch, {
    restoreId: restore._id,
    token: restore.token,
    phase: restore.phase as RestorePhase,
    cursor: restore.cursor,
    attempt: restore.attempt,
  });
}

async function moveToPhase(
  ctx: MutationCtx,
  restore: Doc<"draftRestores">,
  phase: RestorePhase,
) {
  const status = phase.startsWith("validate") ? "validating" : "applying";
  await ctx.db.patch(restore._id, {
    status,
    phase,
    cursor: undefined,
    attempt: 0,
    failure: undefined,
    updatedAt: Date.now(),
  });
  await ctx.scheduler.runAfter(0, internal.draftRestore.processBatch, {
    restoreId: restore._id,
    token: restore.token,
    phase,
    attempt: 0,
  });
}

async function continuePage(
  ctx: MutationCtx,
  restore: Doc<"draftRestores">,
  phase: RestorePhase,
  page: { isDone: boolean; continueCursor: string },
) {
  if (page.isDone) {
    const next = nextDraftRestorePhase[phase];
    if (next) await moveToPhase(ctx, restore, next);
    return;
  }
  await ctx.db.patch(restore._id, {
    cursor: page.continueCursor,
    attempt: 0,
    updatedAt: Date.now(),
  });
  await ctx.scheduler.runAfter(0, internal.draftRestore.processBatch, {
    restoreId: restore._id,
    token: restore.token,
    phase,
    cursor: page.continueCursor,
    attempt: 0,
  });
}

async function requireReleasePage(
  ctx: MutationCtx,
  restore: Doc<"draftRestores">,
  pageId: Id<"pages">,
) {
  const snapshot = await ctx.db
    .query("releasePages")
    .withIndex("by_release_page", (q) =>
      q.eq("releaseId", restore.releaseId).eq("pageId", pageId),
    )
    .unique();
  if (!snapshot) throw new Error("Historical page hierarchy is incomplete");
}

async function validatePages(
  ctx: MutationCtx,
  restore: Doc<"draftRestores">,
  cursor?: string,
) {
  const page = await ctx.db
    .query("releasePages")
    .withIndex("by_release", (q) => q.eq("releaseId", restore.releaseId))
    .paginate({ cursor: cursor ?? null, numItems: SMALL_BATCH });
  for (const snapshot of page.page) {
    const current = await ctx.db.get(snapshot.pageId);
    if (!current || current.siteId !== restore.siteId) {
      throw new Error("A historical page identity is missing");
    }
    if (snapshot.parentId) {
      await requireReleasePage(ctx, restore, snapshot.parentId);
    }
    if (snapshot.contentRevisionId) {
      const revision = await ctx.db.get(snapshot.contentRevisionId);
      if (!revision || revision.siteId !== restore.siteId) {
        throw new Error("Historical page content is missing");
      }
      const payload = await ctx.db.get(revision.payloadId);
      if (!payload || payload.siteId !== restore.siteId) {
        throw new Error("Historical page content payload is missing");
      }
      parseOpenEditorDocument(payload.content);
    }
  }
  await continuePage(ctx, restore, "validatePages", page);
}

async function validateLibraries(
  ctx: MutationCtx,
  restore: Doc<"draftRestores">,
  cursor?: string,
) {
  const page = await ctx.db
    .query("releaseLibraries")
    .withIndex("by_release", (q) => q.eq("releaseId", restore.releaseId))
    .paginate({ cursor: cursor ?? null, numItems: METADATA_BATCH });
  for (const snapshot of page.page) {
    const current = await ctx.db.get(snapshot.libraryId);
    if (!current || current.siteId !== restore.siteId) {
      throw new Error("A historical library identity is missing");
    }
  }
  await continuePage(ctx, restore, "validateLibraries", page);
}

async function validateFolders(
  ctx: MutationCtx,
  restore: Doc<"draftRestores">,
  cursor?: string,
) {
  const page = await ctx.db
    .query("releaseFolders")
    .withIndex("by_release", (q) => q.eq("releaseId", restore.releaseId))
    .paginate({ cursor: cursor ?? null, numItems: METADATA_BATCH });
  for (const snapshot of page.page) {
    const [current, library, parent] = await Promise.all([
      ctx.db.get(snapshot.folderId),
      ctx.db
        .query("releaseLibraries")
        .withIndex("by_release_library", (q) =>
          q
            .eq("releaseId", restore.releaseId)
            .eq("libraryId", snapshot.libraryId),
        )
        .unique(),
      snapshot.parentId
        ? ctx.db
            .query("releaseFolders")
            .withIndex("by_release_folder", (q) =>
              q
                .eq("releaseId", restore.releaseId)
                .eq("folderId", snapshot.parentId!),
            )
            .unique()
        : null,
    ]);
    if (!current || current.siteId !== restore.siteId) {
      throw new Error("A historical folder identity is missing");
    }
    if (!library || (snapshot.parentId && !parent)) {
      throw new Error("Historical folder hierarchy is incomplete");
    }
  }
  await continuePage(ctx, restore, "validateFolders", page);
}

async function validateFiles(
  ctx: MutationCtx,
  restore: Doc<"draftRestores">,
  cursor?: string,
) {
  const release = await ctx.db.get(restore.releaseId);
  if (!release) throw new Error("Historical version is missing");
  const page = await ctx.db
    .query("releaseFiles")
    .withIndex("by_release", (q) => q.eq("releaseId", restore.releaseId))
    .paginate({ cursor: cursor ?? null, numItems: SMALL_BATCH });
  for (const snapshot of page.page) {
    const current = await ctx.db.get(snapshot.fileId);
    if (!current || current.siteId !== restore.siteId) {
      throw new Error("A historical file identity is missing");
    }
    if (snapshot.libraryId) {
      const library = await ctx.db
        .query("releaseLibraries")
        .withIndex("by_release_library", (q) =>
          q
            .eq("releaseId", restore.releaseId)
            .eq("libraryId", snapshot.libraryId!),
        )
        .unique();
      if (!library) throw new Error("Historical file library is missing");
    }
    if (snapshot.folderId) {
      const folder = await ctx.db
        .query("releaseFolders")
        .withIndex("by_release_folder", (q) =>
          q
            .eq("releaseId", restore.releaseId)
            .eq("folderId", snapshot.folderId!),
        )
        .unique();
      if (!folder) throw new Error("Historical file folder is missing");
    }
  }
  if (release.defaultPageId) {
    await requireReleasePage(ctx, restore, release.defaultPageId);
  }
  if (release.logoFileId) {
    const logo = await ctx.db
      .query("releaseFiles")
      .withIndex("by_release_file", (q) =>
        q.eq("releaseId", restore.releaseId).eq("fileId", release.logoFileId!),
      )
      .unique();
    if (!logo) throw new Error("Historical logo is missing");
  }
  await continuePage(ctx, restore, "validateFiles", page);
}

async function archivePages(
  ctx: MutationCtx,
  restore: Doc<"draftRestores">,
  cursor?: string,
) {
  const page = await ctx.db
    .query("pages")
    .withIndex("by_site", (q) => q.eq("siteId", restore.siteId))
    .paginate({ cursor: cursor ?? null, numItems: SMALL_BATCH });
  const now = Date.now();
  for (const current of page.page) {
    const snapshot = await ctx.db
      .query("releasePages")
      .withIndex("by_release_page", (q) =>
        q.eq("releaseId", restore.releaseId).eq("pageId", current._id),
      )
      .unique();
    if (!snapshot && current.deletedAt === undefined) {
      await ctx.db.patch(current._id, { deletedAt: now, updatedAt: now });
      await removePageContentIndex(ctx, current._id);
    }
  }
  await continuePage(ctx, restore, "archivePages", page);
}

async function restorePages(
  ctx: MutationCtx,
  restore: Doc<"draftRestores">,
  cursor?: string,
) {
  const page = await ctx.db
    .query("releasePages")
    .withIndex("by_release", (q) => q.eq("releaseId", restore.releaseId))
    .paginate({ cursor: cursor ?? null, numItems: SMALL_BATCH });
  const now = Date.now();
  for (const snapshot of page.page) {
    await ctx.db.patch(snapshot.pageId, {
      parentId: snapshot.parentId,
      title: snapshot.title,
      slug: snapshot.slug,
      icon: snapshot.icon,
      order: snapshot.order,
      deletedAt: undefined,
      updatedAt: now,
    });
    const document = await ctx.db
      .query("pageDocuments")
      .withIndex("by_page", (q) => q.eq("pageId", snapshot.pageId))
      .unique();
    if (snapshot.contentRevisionId) {
      const revision = await ctx.db.get(snapshot.contentRevisionId);
      if (!revision) throw new Error("Historical page content is missing");
      const value = {
        siteId: restore.siteId,
        pageId: snapshot.pageId,
        revisionId: snapshot.contentRevisionId,
        contentHash: snapshot.contentHash ?? "",
        contentSize: revision.contentSize,
        updatedAt: now,
      };
      if (document) await ctx.db.replace(document._id, value);
      else await ctx.db.insert("pageDocuments", value);
    } else if (document) {
      await ctx.db.delete(document._id);
    }
    // Fence any coalesced index job created by the draft that is being
    // replaced. Otherwise its delayed flush can overwrite this restored
    // entry with content from the pre-restore revision.
    await removePageContentIndex(ctx, snapshot.pageId);
    await indexPageContent(ctx, snapshot.pageId);
  }
  await continuePage(ctx, restore, "restorePages", page);
}

async function archiveLibraries(
  ctx: MutationCtx,
  restore: Doc<"draftRestores">,
  cursor?: string,
) {
  const page = await ctx.db
    .query("documentLibraries")
    .withIndex("by_site", (q) => q.eq("siteId", restore.siteId))
    .paginate({ cursor: cursor ?? null, numItems: METADATA_BATCH });
  const now = Date.now();
  for (const current of page.page) {
    const snapshot = await ctx.db
      .query("releaseLibraries")
      .withIndex("by_release_library", (q) =>
        q.eq("releaseId", restore.releaseId).eq("libraryId", current._id),
      )
      .unique();
    if (!snapshot && current.deletedAt === undefined) {
      await ctx.db.patch(current._id, { deletedAt: now, updatedAt: now });
    }
  }
  await continuePage(ctx, restore, "archiveLibraries", page);
}

async function restoreLibraries(
  ctx: MutationCtx,
  restore: Doc<"draftRestores">,
  cursor?: string,
) {
  const page = await ctx.db
    .query("releaseLibraries")
    .withIndex("by_release", (q) => q.eq("releaseId", restore.releaseId))
    .paginate({ cursor: cursor ?? null, numItems: METADATA_BATCH });
  const now = Date.now();
  for (const snapshot of page.page) {
    await ctx.db.patch(snapshot.libraryId, {
      name: snapshot.name,
      deletedAt: undefined,
      updatedAt: now,
    });
  }
  await continuePage(ctx, restore, "restoreLibraries", page);
}

async function archiveFolders(
  ctx: MutationCtx,
  restore: Doc<"draftRestores">,
  cursor?: string,
) {
  const page = await ctx.db
    .query("documentFolders")
    .withIndex("by_site", (q) => q.eq("siteId", restore.siteId))
    .paginate({ cursor: cursor ?? null, numItems: METADATA_BATCH });
  const now = Date.now();
  for (const current of page.page) {
    const snapshot = await ctx.db
      .query("releaseFolders")
      .withIndex("by_release_folder", (q) =>
        q.eq("releaseId", restore.releaseId).eq("folderId", current._id),
      )
      .unique();
    if (!snapshot && current.deletedAt === undefined) {
      await ctx.db.patch(current._id, { deletedAt: now, updatedAt: now });
    }
  }
  await continuePage(ctx, restore, "archiveFolders", page);
}

async function restoreFolders(
  ctx: MutationCtx,
  restore: Doc<"draftRestores">,
  cursor?: string,
) {
  const page = await ctx.db
    .query("releaseFolders")
    .withIndex("by_release", (q) => q.eq("releaseId", restore.releaseId))
    .paginate({ cursor: cursor ?? null, numItems: METADATA_BATCH });
  const now = Date.now();
  for (const snapshot of page.page) {
    await ctx.db.patch(snapshot.folderId, {
      libraryId: snapshot.libraryId,
      parentId: snapshot.parentId,
      name: snapshot.name,
      order: snapshot.order,
      deletedAt: undefined,
      updatedAt: now,
    });
  }
  await continuePage(ctx, restore, "restoreFolders", page);
}

async function archiveFiles(
  ctx: MutationCtx,
  restore: Doc<"draftRestores">,
  cursor?: string,
) {
  const page = await ctx.db
    .query("files")
    .withIndex("by_site", (q) => q.eq("siteId", restore.siteId))
    .paginate({ cursor: cursor ?? null, numItems: SMALL_BATCH });
  for (const current of page.page) {
    const snapshot = await ctx.db
      .query("releaseFiles")
      .withIndex("by_release_file", (q) =>
        q.eq("releaseId", restore.releaseId).eq("fileId", current._id),
      )
      .unique();
    if (!snapshot && current.deletedAt === undefined) {
      await deleteFileRows(ctx, current);
    }
  }
  await continuePage(ctx, restore, "archiveFiles", page);
}

async function restoreFiles(
  ctx: MutationCtx,
  restore: Doc<"draftRestores">,
  cursor?: string,
) {
  const page = await ctx.db
    .query("releaseFiles")
    .withIndex("by_release", (q) => q.eq("releaseId", restore.releaseId))
    .paginate({ cursor: cursor ?? null, numItems: SMALL_BATCH });
  for (const snapshot of page.page) {
    await ctx.db.patch(snapshot.fileId, {
      objectKey: snapshot.objectKey,
      filename: snapshot.filename,
      contentType: snapshot.contentType,
      size: snapshot.size,
      checksum: snapshot.checksum,
      libraryId: snapshot.libraryId,
      folderId: snapshot.folderId,
      order: snapshot.order,
      deletedAt: undefined,
    });
    const current = await ctx.db.get(snapshot.fileId);
    if (current) await reconcileRestoredFile(ctx, current);
  }
  await continuePage(ctx, restore, "restoreFiles", page);
}

async function synchronizeParents(
  ctx: MutationCtx,
  restore: Doc<"draftRestores">,
  cursor?: string,
) {
  const page = await ctx.db
    .query("pages")
    .withIndex("by_site", (q) => q.eq("siteId", restore.siteId))
    .paginate({ cursor: cursor ?? null, numItems: SMALL_BATCH });
  const now = Date.now();
  for (const current of page.page) {
    if (current.deletedAt === undefined) {
      await synchronizeParentDocument(ctx, current._id, now, {
        touchDraft: false,
      });
    }
  }
  await continuePage(ctx, restore, "synchronizeParents", page);
}

async function clearDraftChanges(
  ctx: MutationCtx,
  restore: Doc<"draftRestores">,
) {
  const rows = await ctx.db
    .query("draftChanges")
    .withIndex("by_site", (q) => q.eq("siteId", restore.siteId))
    .take(METADATA_BATCH);
  for (const row of rows) await ctx.db.delete(row._id);
  if (rows.length === METADATA_BATCH) {
    await ctx.db.patch(restore._id, { updatedAt: Date.now() });
    await schedule(ctx, restore);
    return;
  }
  await moveToPhase(ctx, restore, "activate");
}

async function activate(ctx: MutationCtx, restore: Doc<"draftRestores">) {
  const [site, release] = await Promise.all([
    ctx.db.get(restore.siteId),
    ctx.db.get(restore.releaseId),
  ]);
  if (!site || !release || site.activeDraftRestoreId !== restore._id) {
    throw new Error("Draft restore lease was lost");
  }
  if (site.draftRevision !== restore.baseDraftRevision) {
    throw new Error("The draft changed while the restore was running");
  }
  const now = Date.now();
  const resultDraftRevision = restore.baseDraftRevision + 1;
  await ctx.db.patch(site._id, {
    name: release.name,
    logoFileId: release.logoFileId,
    logoUrl: release.logoFileId
      ? `/api/files/${release.logoFileId}`
      : undefined,
    defaultPageId: release.defaultPageId,
    settings: release.settings,
    draftRevision: resultDraftRevision,
    draftBaseReleaseId: release._id,
    activeDraftRestoreId: undefined,
    updatedAt: now,
  });
  await ctx.db.insert("publicationEvents", {
    siteId: site._id,
    action: "restoreDraft",
    fromReleaseId: site.liveReleaseId,
    toReleaseId: release._id,
    actorId: restore.requestedBy,
    createdAt: now,
  });
  await ctx.db.patch(restore._id, {
    status: "complete",
    resultDraftRevision,
    cursor: undefined,
    failure: undefined,
    completedAt: now,
    updatedAt: now,
  });
}

export const applyBatch = internalMutation({
  args: {
    restoreId: v.id("draftRestores"),
    token: v.string(),
    phase: phaseValidator,
    cursor: v.optional(v.string()),
    attempt: v.number(),
  },
  handler: async (ctx, args) => {
    const restore = await ctx.db.get(args.restoreId);
    if (!restore || !restoreBatchMatches(restore, args)) {
      return { applied: false };
    }
    const site = await ctx.db.get(restore.siteId);
    if (
      !site ||
      site.activeDraftRestoreId !== restore._id ||
      site.draftRevision !== restore.baseDraftRevision
    ) {
      throw new Error("Draft restore lease was lost");
    }

    switch (args.phase) {
      case "validatePages":
        await validatePages(ctx, restore, args.cursor);
        break;
      case "validateLibraries":
        await validateLibraries(ctx, restore, args.cursor);
        break;
      case "validateFolders":
        await validateFolders(ctx, restore, args.cursor);
        break;
      case "validateFiles":
        await validateFiles(ctx, restore, args.cursor);
        break;
      case "archivePages":
        await archivePages(ctx, restore, args.cursor);
        break;
      case "restorePages":
        await restorePages(ctx, restore, args.cursor);
        break;
      case "archiveLibraries":
        await archiveLibraries(ctx, restore, args.cursor);
        break;
      case "restoreLibraries":
        await restoreLibraries(ctx, restore, args.cursor);
        break;
      case "archiveFolders":
        await archiveFolders(ctx, restore, args.cursor);
        break;
      case "restoreFolders":
        await restoreFolders(ctx, restore, args.cursor);
        break;
      case "archiveFiles":
        await archiveFiles(ctx, restore, args.cursor);
        break;
      case "restoreFiles":
        await restoreFiles(ctx, restore, args.cursor);
        break;
      case "synchronizeParents":
        await synchronizeParents(ctx, restore, args.cursor);
        break;
      case "clearDraftChanges":
        await clearDraftChanges(ctx, restore);
        break;
      case "activate":
        await activate(ctx, restore);
        break;
    }
    return { applied: true };
  },
});

function safeFailure(error: unknown) {
  return (error instanceof Error ? error.message : String(error))
    .replaceAll(/[\r\n\t]+/gu, " ")
    .slice(0, 300);
}

export function restoreRetryDelayMs(attempt: number) {
  return Math.min(30_000, 1_000 * 2 ** Math.max(0, attempt));
}

export function restoreBatchMatches(
  restore: Pick<
    Doc<"draftRestores">,
    "token" | "phase" | "cursor" | "attempt" | "status"
  > | null,
  args: {
    token: string;
    phase: RestorePhase;
    cursor?: string;
    attempt: number;
  },
) {
  return Boolean(
    restore &&
      restore.token === args.token &&
      restore.phase === args.phase &&
      restore.attempt === args.attempt &&
      cursorMatches(restore.cursor, args.cursor) &&
      (restore.status === "validating" || restore.status === "applying"),
  );
}

export const handleBatchFailure = internalMutation({
  args: {
    restoreId: v.id("draftRestores"),
    token: v.string(),
    phase: phaseValidator,
    cursor: v.optional(v.string()),
    attempt: v.number(),
    failure: v.string(),
  },
  handler: async (ctx, args) => {
    const restore = await ctx.db.get(args.restoreId);
    if (!restore || !restoreBatchMatches(restore, args)) {
      return { applied: false };
    }
    const nextAttempt = Math.max(0, Math.floor(args.attempt)) + 1;
    if (nextAttempt >= MAX_ATTEMPTS) {
      const site = await ctx.db.get(restore.siteId);
      if (restore.status === "validating") {
        if (site?.activeDraftRestoreId === restore._id) {
          await ctx.db.patch(site._id, { activeDraftRestoreId: undefined });
        }
        await ctx.db.patch(restore._id, {
          status: "failed",
          failure: args.failure,
          attempt: nextAttempt,
          updatedAt: Date.now(),
        });
      } else {
        // Once application starts, retain the lock and roll forward on an
        // explicit resume. Exposing or rolling back a partially applied draft
        // would be less safe than keeping it unavailable.
        await ctx.db.patch(restore._id, {
          status: "paused",
          failure: args.failure,
          attempt: nextAttempt,
          updatedAt: Date.now(),
        });
      }
      return { applied: true, paused: true };
    }
    await ctx.db.patch(restore._id, {
      failure: args.failure,
      attempt: nextAttempt,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(
      restoreRetryDelayMs(nextAttempt),
      internal.draftRestore.processBatch,
      {
        restoreId: restore._id,
        token: restore.token,
        phase: args.phase,
        cursor: args.cursor,
        attempt: nextAttempt,
      },
    );
    return { applied: true, paused: false };
  },
});

export const processBatch: ReturnType<typeof internalAction> = internalAction({
  args: {
    restoreId: v.id("draftRestores"),
    token: v.string(),
    phase: phaseValidator,
    cursor: v.optional(v.string()),
    attempt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      return await ctx.runMutation(internal.draftRestore.applyBatch, {
        restoreId: args.restoreId,
        token: args.token,
        phase: args.phase,
        cursor: args.cursor,
        attempt: args.attempt ?? 0,
      });
    } catch (error) {
      return await ctx.runMutation(internal.draftRestore.handleBatchFailure, {
        ...args,
        attempt: args.attempt ?? 0,
        failure: safeFailure(error),
      });
    }
  },
});

export const recoverStalled = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - STALLED_RESTORE_MS;
    const [validating, applying] = await Promise.all([
      ctx.db
        .query("draftRestores")
        .withIndex("by_status_updated", (q) =>
          q.eq("status", "validating").lt("updatedAt", cutoff),
        )
        .take(10),
      ctx.db
        .query("draftRestores")
        .withIndex("by_status_updated", (q) =>
          q.eq("status", "applying").lt("updatedAt", cutoff),
        )
        .take(10),
    ]);
    for (const restore of [...validating, ...applying]) {
      await ctx.db.patch(restore._id, { updatedAt: Date.now() });
      await schedule(ctx, restore);
    }
    return { recovered: validating.length + applying.length };
  },
});
