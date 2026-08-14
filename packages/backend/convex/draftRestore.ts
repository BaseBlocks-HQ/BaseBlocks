import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { workflows } from "./workflows";
import { deleteFileRows } from "./files";
import { recordStorageUsageEvent } from "./model/storageTelemetry";
import { attachedSiteAssetLifecycle } from "./model/siteAssets";
import { reconcileRestoredFile } from "./fileExtraction";
import { removePageContentIndex, indexPageContent } from "./search";
import { synchronizeParentDocument } from "./model/pageHierarchy";
import { parseOpenEditorDocument } from "./pageContentFormat";

const SMALL_BATCH = 6;
const METADATA_BATCH = 20;

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

async function continuePage(page: { isDone: boolean; continueCursor: string }) {
  return page;
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
  return continuePage(page);
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
  return continuePage(page);
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
  return continuePage(page);
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
  if (release.faviconFileId) {
    const favicon = await ctx.db
      .query("releaseFiles")
      .withIndex("by_release_file", (q) =>
        q
          .eq("releaseId", restore.releaseId)
          .eq("fileId", release.faviconFileId!),
      )
      .unique();
    if (!favicon) throw new Error("Historical favicon is missing");
  }
  return continuePage(page);
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
  return continuePage(page);
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
  return continuePage(page);
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
  return continuePage(page);
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
  return continuePage(page);
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
  return continuePage(page);
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
  return continuePage(page);
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
  return continuePage(page);
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
  const site = await ctx.db.get(restore.siteId);
  if (!site) throw new Error("Site not found while restoring files");
  for (const snapshot of page.page) {
    const previous = await ctx.db.get(snapshot.fileId);
    if (previous?.deletedAt !== undefined) {
      await recordStorageUsageEvent(ctx, {
        organizationId: site.organizationId,
        siteId: site._id,
        fileId: previous._id,
        kind: "restore",
        bytes: previous.size,
        idempotencyKey: `file:restore:${restore._id}:${previous._id}`,
      });
    }
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
      ...(snapshot.kind === "siteAsset"
        ? attachedSiteAssetLifecycle(previous?.assetAttachedAt ?? Date.now())
        : {}),
    });
    const current = await ctx.db.get(snapshot.fileId);
    if (current) await reconcileRestoredFile(ctx, current);
  }
  return continuePage(page);
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
  return continuePage(page);
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
  return rows.length < METADATA_BATCH;
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
    faviconFileId: release.faviconFileId,
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
    failure: undefined,
    completedAt: now,
    updatedAt: now,
  });
}

export const applyBatch = internalMutation({
  args: {
    restoreId: v.id("draftRestores"),
    phase: phaseValidator,
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const restore = await ctx.db.get(args.restoreId);
    if (!restore) return null;
    const expectedStatus = args.phase.startsWith("validate")
      ? "validating"
      : "applying";
    if (restore.status !== expectedStatus) return null;
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
        return validatePages(ctx, restore, args.cursor);
      case "validateLibraries":
        return validateLibraries(ctx, restore, args.cursor);
      case "validateFolders":
        return validateFolders(ctx, restore, args.cursor);
      case "validateFiles":
        return validateFiles(ctx, restore, args.cursor);
      case "archivePages":
        return archivePages(ctx, restore, args.cursor);
      case "restorePages":
        return restorePages(ctx, restore, args.cursor);
      case "archiveLibraries":
        return archiveLibraries(ctx, restore, args.cursor);
      case "restoreLibraries":
        return restoreLibraries(ctx, restore, args.cursor);
      case "archiveFolders":
        return archiveFolders(ctx, restore, args.cursor);
      case "restoreFolders":
        return restoreFolders(ctx, restore, args.cursor);
      case "archiveFiles":
        return archiveFiles(ctx, restore, args.cursor);
      case "restoreFiles":
        return restoreFiles(ctx, restore, args.cursor);
      case "synchronizeParents":
        return synchronizeParents(ctx, restore, args.cursor);
      case "clearDraftChanges":
        return null;
      case "activate":
        return null;
    }
  },
});

export const setApplying = internalMutation({
  args: { restoreId: v.id("draftRestores") },
  handler: async (ctx, { restoreId }) => {
    await ctx.db.patch(restoreId, {
      status: "applying",
      updatedAt: Date.now(),
    });
  },
});

export const clearChangesBatch = internalMutation({
  args: { restoreId: v.id("draftRestores") },
  handler: async (ctx, { restoreId }) => {
    const restore = await ctx.db.get(restoreId);
    return restore ? clearDraftChanges(ctx, restore) : true;
  },
});

export const finish = internalMutation({
  args: { restoreId: v.id("draftRestores") },
  handler: async (ctx, { restoreId }) => {
    const restore = await ctx.db.get(restoreId);
    if (restore) await activate(ctx, restore);
  },
});

export const fail = internalMutation({
  args: {
    restoreId: v.id("draftRestores"),
    applying: v.boolean(),
    failure: v.string(),
  },
  handler: async (ctx, { restoreId, applying, failure }) => {
    const restore = await ctx.db.get(restoreId);
    if (!restore) return;
    if (!applying) {
      const site = await ctx.db.get(restore.siteId);
      if (site?.activeDraftRestoreId === restoreId) {
        await ctx.db.patch(site._id, { activeDraftRestoreId: undefined });
      }
    }
    await ctx.db.patch(restoreId, {
      status: applying ? "paused" : "failed",
      failure: failure.replaceAll(/[\r\n\t]+/gu, " ").slice(0, 300),
      updatedAt: Date.now(),
    });
  },
});

export const run = workflows
  .define({ args: { restoreId: v.id("draftRestores") } })
  .handler(async (step, { restoreId }): Promise<void> => {
    let applying = false;
    try {
      const phases: RestorePhase[] = [
        "validatePages",
        "validateLibraries",
        "validateFolders",
        "validateFiles",
        "archivePages",
        "restorePages",
        "archiveLibraries",
        "restoreLibraries",
        "archiveFolders",
        "restoreFolders",
        "archiveFiles",
        "restoreFiles",
        "synchronizeParents",
      ];
      for (const phase of phases) {
        if (!applying && phase === "archivePages") {
          applying = true;
          await step.runMutation(internal.draftRestore.setApplying, {
            restoreId,
          });
        }
        let cursor: string | undefined;
        do {
          const page: { isDone: boolean; continueCursor: string } | null =
            await step.runMutation(internal.draftRestore.applyBatch, {
              restoreId,
              phase,
              cursor,
            });
          if (!page) return;
          cursor = page.isDone ? undefined : page.continueCursor;
        } while (cursor);
      }
      let changesCleared = false;
      while (!changesCleared) {
        changesCleared = await step.runMutation(
          internal.draftRestore.clearChangesBatch,
          { restoreId },
        );
      }
      await step.runMutation(internal.draftRestore.finish, { restoreId });
    } catch (error) {
      await step.runMutation(internal.draftRestore.fail, {
        restoreId,
        applying,
        failure: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });
