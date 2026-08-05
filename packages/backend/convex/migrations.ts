import { paginationOptsValidator } from "convex/server";
import { ConvexError, getConvexSize, v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { getOrCreateContentObject } from "./model/contentObjects";
import { clearDraftChanges } from "./model/draftChanges";
import { collectReleaseChanges } from "./model/releaseChanges";
import { buildHistoricalReleaseChangeDetail } from "./model/releaseChangeDetails";
import {
  hashOpenEditorContent,
  parseOpenEditorDocument,
  type OpenEditorDocument,
} from "./pageContentFormat";

function repairEmptyLegacyDocuments(value: unknown, path = "root"): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      repairEmptyLegacyDocuments(item, `${path}_${index}`),
    );
  }
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const repaired = Object.fromEntries(
    Object.entries(record).map(([key, child]) => [
      key,
      repairEmptyLegacyDocuments(child, `${path}_${key}`),
    ]),
  );
  if (
    repaired.type === "doc" &&
    Array.isArray(repaired.content) &&
    repaired.content.length === 0
  ) {
    repaired.content = [
      {
        type: "paragraph",
        attrs: { "openeditor-id": `oe_migrated_empty_${path}`.slice(0, 120) },
      },
    ];
  }
  return repaired;
}

export const backfillContentGraph = internalMutation({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.any(),
  handler: async (ctx, { paginationOpts }) => {
    const page = await ctx.db.query("pageDocuments").paginate(paginationOpts);
    let migrated = 0;
    for (const document of page.page) {
      if (document.revisionId) continue;
      if (!document.blobId) {
        throw new ConvexError(`Page document ${document._id} has no content`);
      }
      const blob = await ctx.db.get(document.blobId);
      if (!blob) throw new ConvexError(`Missing blob ${document.blobId}`);
      const decoded = JSON.parse(blob.content);
      let parsed: OpenEditorDocument;
      let repaired = false;
      try {
        parsed = parseOpenEditorDocument(decoded);
      } catch {
        parsed = parseOpenEditorDocument(repairEmptyLegacyDocuments(decoded));
        repaired = true;
      }
      const serialized = JSON.stringify(parsed);
      const contentHash = hashOpenEditorContent(serialized);
      if (!repaired && contentHash !== document.contentHash) {
        throw new ConvexError(`Content hash mismatch for ${document._id}`);
      }
      const { revisionId } = await getOrCreateContentObject(ctx, {
        siteId: document.siteId,
        content: serialized,
        contentHash,
        contentSize: getConvexSize(serialized),
        document: parsed,
        createdAt: document.updatedAt,
      });
      await ctx.db.patch(document._id, {
        revisionId,
        contentHash,
        contentSize: getConvexSize(serialized),
      });
      const releasePages = await ctx.db
        .query("releasePages")
        .withIndex("by_blob", (q) => q.eq("blobId", document.blobId))
        .collect();
      for (const releasePage of releasePages) {
        await ctx.db.patch(releasePage._id, {
          contentRevisionId: revisionId,
          contentHash,
        });
      }
      migrated += 1;
    }
    return {
      cursor: page.continueCursor,
      isDone: page.isDone,
      scanned: page.page.length,
      migrated,
    };
  },
});

export const backfillFolderSites = internalMutation({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.any(),
  handler: async (ctx, { paginationOpts }) => {
    const page = await ctx.db.query("documentFolders").paginate(paginationOpts);
    let migrated = 0;
    for (const folder of page.page) {
      if (folder.siteId) continue;
      const library = await ctx.db.get(folder.libraryId);
      if (!library)
        throw new ConvexError(`Missing library ${folder.libraryId}`);
      await ctx.db.patch(folder._id, { siteId: library.siteId });
      migrated += 1;
    }
    return {
      cursor: page.continueCursor,
      isDone: page.isDone,
      scanned: page.page.length,
      migrated,
    };
  },
});

export const backfillAiRevertContent = internalMutation({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.any(),
  handler: async (ctx, { paginationOpts }) => {
    const page = await ctx.db
      .query("aiChangesetReverts")
      .paginate(paginationOpts);
    let migrated = 0;
    for (const revert of page.page) {
      let changed = false;
      const previousPages = [];
      for (const previous of revert.previousPages) {
        if (previous.contentRevisionId || !previous.documentBlobId) {
          previousPages.push(previous);
          continue;
        }
        const blob = await ctx.db.get(previous.documentBlobId);
        if (!blob) {
          throw new ConvexError(
            `Missing AI revert blob ${previous.documentBlobId}`,
          );
        }
        const parsed = parseOpenEditorDocument(blob.content);
        const serialized = JSON.stringify(parsed);
        const contentHash = hashOpenEditorContent(serialized);
        const { revisionId } = await getOrCreateContentObject(ctx, {
          siteId: revert.siteId,
          content: serialized,
          contentHash,
          contentSize: getConvexSize(serialized),
          document: parsed,
          createdAt: revert.createdAt,
        });
        previousPages.push({ ...previous, contentRevisionId: revisionId });
        changed = true;
      }
      if (changed) {
        await ctx.db.patch(revert._id, { previousPages });
        migrated += 1;
      }
    }
    return {
      cursor: page.continueCursor,
      isDone: page.isDone,
      scanned: page.page.length,
      migrated,
    };
  },
});

export const backfillReleaseContent = internalMutation({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.any(),
  handler: async (ctx, { paginationOpts }) => {
    const page = await ctx.db.query("releasePages").paginate(paginationOpts);
    let migrated = 0;
    let replacedFromDraft = 0;
    for (const releasePage of page.page) {
      if (releasePage.contentRevisionId || !releasePage.blobId) continue;
      const blob = await ctx.db.get(releasePage.blobId);
      if (!blob)
        throw new ConvexError(`Missing release blob ${releasePage.blobId}`);
      const decoded = JSON.parse(blob.content);
      let parsed: OpenEditorDocument;
      try {
        parsed = parseOpenEditorDocument(decoded);
      } catch {
        try {
          parsed = parseOpenEditorDocument(repairEmptyLegacyDocuments(decoded));
        } catch {
          const document = await ctx.db
            .query("pageDocuments")
            .withIndex("by_page", (q) => q.eq("pageId", releasePage.pageId))
            .unique();
          if (!document?.revisionId) {
            throw new ConvexError(
              `Legacy release page ${releasePage._id} has no valid draft replacement`,
            );
          }
          await ctx.db.patch(releasePage._id, {
            contentRevisionId: document.revisionId,
            contentHash: document.contentHash,
          });
          migrated += 1;
          replacedFromDraft += 1;
          continue;
        }
      }
      const serialized = JSON.stringify(parsed);
      const contentHash = hashOpenEditorContent(serialized);
      const { revisionId } = await getOrCreateContentObject(ctx, {
        siteId: releasePage.siteId,
        content: serialized,
        contentHash,
        contentSize: getConvexSize(serialized),
        document: parsed,
        createdAt: releasePage.updatedAt,
      });
      await ctx.db.patch(releasePage._id, {
        contentRevisionId: revisionId,
        contentHash,
      });
      migrated += 1;
    }
    return {
      cursor: page.continueCursor,
      isDone: page.isDone,
      scanned: page.page.length,
      migrated,
      replacedFromDraft,
    };
  },
});

export const backfillDraftLedger = internalMutation({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.any(),
  handler: async (ctx, { paginationOpts }) => {
    const page = await ctx.db.query("sites").paginate(paginationOpts);
    let migrated = 0;
    for (const site of page.page) {
      await clearDraftChanges(ctx, site._id);
      const changes = await collectReleaseChanges(
        ctx,
        site,
        site.liveReleaseId,
      );
      const now = Date.now();
      for (const change of changes) {
        await ctx.db.insert("draftChanges", {
          siteId: site._id,
          ...change,
          updatedAt: now,
        });
      }
      await ctx.db.patch(site._id, { draftBaseReleaseId: site.liveReleaseId });
      migrated += 1;
    }
    return {
      cursor: page.continueCursor,
      isDone: page.isDone,
      scanned: page.page.length,
      migrated,
    };
  },
});

export const backfillReleaseChangeDetails = internalMutation({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.any(),
  handler: async (ctx, { paginationOpts }) => {
    const page = await ctx.db.query("releaseChanges").paginate(paginationOpts);
    let migrated = 0;
    for (const change of page.page) {
      if (change.fields) continue;
      const release = await ctx.db.get(change.releaseId);
      if (!release)
        throw new ConvexError(`Missing release ${change.releaseId}`);
      const detail = await buildHistoricalReleaseChangeDetail(
        ctx,
        release,
        change,
      );
      await ctx.db.patch(change._id, detail);
      migrated += 1;
    }
    return {
      cursor: page.continueCursor,
      isDone: page.isDone,
      scanned: page.page.length,
      migrated,
    };
  },
});

export const detachLegacyContentPointers = internalMutation({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.any(),
  handler: async (ctx, { paginationOpts }) => {
    const page = await ctx.db.query("pageDocuments").paginate(paginationOpts);
    let migrated = 0;
    for (const document of page.page) {
      if (!document.revisionId) {
        throw new ConvexError(`Document ${document._id} was not migrated`);
      }
      if (document.blobId || document.referencesKey !== undefined) {
        await ctx.db.patch(document._id, {
          blobId: undefined,
          referencesKey: undefined,
        });
        migrated += 1;
      }
    }
    return {
      cursor: page.continueCursor,
      isDone: page.isDone,
      scanned: page.page.length,
      migrated,
    };
  },
});

export const detachLegacyReleasePointers = internalMutation({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.any(),
  handler: async (ctx, { paginationOpts }) => {
    const page = await ctx.db.query("releasePages").paginate(paginationOpts);
    let migrated = 0;
    for (const releasePage of page.page) {
      if (releasePage.blobId) {
        if (!releasePage.contentRevisionId) {
          throw new ConvexError(
            `Release page ${releasePage._id} was not migrated`,
          );
        }
        await ctx.db.patch(releasePage._id, { blobId: undefined });
        migrated += 1;
      }
    }
    return {
      cursor: page.continueCursor,
      isDone: page.isDone,
      scanned: page.page.length,
      migrated,
    };
  },
});

export const detachLegacyAiRevertPointers = internalMutation({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.any(),
  handler: async (ctx, { paginationOpts }) => {
    const page = await ctx.db
      .query("aiChangesetReverts")
      .paginate(paginationOpts);
    let migrated = 0;
    for (const revert of page.page) {
      if (!revert.previousPages.some((value) => value.documentBlobId)) continue;
      const previousPages = revert.previousPages.map((previous) => {
        if (previous.documentBlobId && !previous.contentRevisionId) {
          throw new ConvexError(`AI revert ${revert._id} was not migrated`);
        }
        return { ...previous, documentBlobId: undefined };
      });
      await ctx.db.patch(revert._id, { previousPages });
      migrated += 1;
    }
    return {
      cursor: page.continueCursor,
      isDone: page.isDone,
      scanned: page.page.length,
      migrated,
    };
  },
});

export const deleteLegacyPageReferences = internalMutation({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.any(),
  handler: async (ctx, { paginationOpts }) => {
    const page = await ctx.db.query("pageReferences").paginate(paginationOpts);
    for (const reference of page.page) await ctx.db.delete(reference._id);
    return {
      cursor: page.continueCursor,
      isDone: page.isDone,
      deleted: page.page.length,
    };
  },
});

export const deleteLegacyContentBlobs = internalMutation({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.any(),
  handler: async (ctx, { paginationOpts }) => {
    const page = await ctx.db
      .query("pageContentBlobs")
      .paginate(paginationOpts);
    for (const blob of page.page) await ctx.db.delete(blob._id);
    return {
      cursor: page.continueCursor,
      isDone: page.isDone,
      deleted: page.page.length,
    };
  },
});

export const validateArchitecture = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const [sites, documents, releasePages, releaseChanges, folders, reverts] =
      await Promise.all([
        ctx.db.query("sites").collect(),
        ctx.db.query("pageDocuments").collect(),
        ctx.db.query("releasePages").collect(),
        ctx.db.query("releaseChanges").collect(),
        ctx.db.query("documentFolders").collect(),
        ctx.db.query("aiChangesetReverts").collect(),
      ]);
    const anomalies: string[] = [];
    for (const document of documents) {
      if (!document.revisionId) anomalies.push(`document:${document._id}`);
    }
    for (const page of releasePages) {
      if (page.blobId && !page.contentRevisionId) {
        anomalies.push(`releasePage:${page._id}`);
      }
    }
    for (const change of releaseChanges) {
      if (!change.fields) anomalies.push(`releaseChange:${change._id}`);
    }
    for (const folder of folders) {
      if (!folder.siteId) anomalies.push(`folder:${folder._id}`);
    }
    for (const revert of reverts) {
      for (const previous of revert.previousPages) {
        if (previous.documentBlobId && !previous.contentRevisionId) {
          anomalies.push(`aiRevert:${revert._id}:${previous.pageId}`);
        }
      }
    }
    return {
      ok: anomalies.length === 0,
      counts: {
        sites: sites.length,
        documents: documents.length,
        releasePages: releasePages.length,
        releaseChanges: releaseChanges.length,
        folders: folders.length,
        reverts: reverts.length,
      },
      anomalies,
    };
  },
});

export const auditLegacyReleases = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const [sites, releases] = await Promise.all([
      ctx.db.query("sites").collect(),
      ctx.db.query("siteReleases").collect(),
    ]);
    const protectedReleaseIds = new Set(
      sites.flatMap((site) =>
        [site.liveReleaseId, site.draftBaseReleaseId].filter(
          (value): value is NonNullable<typeof value> => value !== undefined,
        ),
      ),
    );
    const invalid = [];
    for (const release of releases) {
      const pages = await ctx.db
        .query("releasePages")
        .withIndex("by_release", (q) => q.eq("releaseId", release._id))
        .collect();
      let invalidPageCount = 0;
      for (const page of pages) {
        if (!page.blobId || page.contentRevisionId) continue;
        const blob = await ctx.db.get(page.blobId);
        if (!blob) {
          invalidPageCount += 1;
          continue;
        }
        try {
          parseOpenEditorDocument(
            repairEmptyLegacyDocuments(JSON.parse(blob.content)),
          );
        } catch {
          invalidPageCount += 1;
        }
      }
      if (invalidPageCount > 0) {
        invalid.push({
          releaseId: release._id,
          number: release.number,
          protected: protectedReleaseIds.has(release._id),
          invalidPageCount,
        });
      }
    }
    return { invalid };
  },
});
