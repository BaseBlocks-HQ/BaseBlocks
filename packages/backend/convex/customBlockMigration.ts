import { getConvexSize, v } from "convex/values";
import { migrateBaseBlocksCustomBlockNodes } from "@baseblocks/openeditor-contracts";
import { internalMutation, internalQuery } from "./_generated/server";
import {
  extractOpenEditorReferences,
  hashOpenEditorContent,
  parseOpenEditorDocument,
} from "./pageContentFormat";
import { recordContentMigrationStorageAdjustment } from "./model/storageTelemetry";
import { extractOpenEditorText } from "./customBlockIndexing";
import {
  draftSearchScope,
  releaseSearchScope,
  upsertSearchEntry,
} from "./search";

/**
 * Build the final content-addressed value for one stored revision.
 * A null result means that the payload already uses only the final node format.
 */
export function migrateContentRevisionPayload(content: string) {
  const stored = JSON.parse(content) as unknown;
  const migrated = migrateBaseBlocksCustomBlockNodes(stored);
  if (migrated === stored) return null;
  const document = parseOpenEditorDocument(migrated);
  const serialized = JSON.stringify(document);
  const references = extractOpenEditorReferences(document);
  return {
    content: serialized,
    contentHash: hashOpenEditorContent(serialized),
    contentSize: getConvexSize(serialized),
    libraryIds: [...references.libraryIds].sort(),
    fileIds: [...references.fileIds].sort(),
    pageIds: [...references.pageIds].sort(),
  };
}

/** Return only user-visible text from the migrated, strictly registered blocks. */
export function migratedContentSearchText(content: string): string {
  return extractOpenEditorText(parseOpenEditorDocument(content));
}

/**
 * One-time alpha migration for every content revision. Each batch updates storage,
 * the payload, revision metadata, draft and release pointers, and search rows in
 * one transaction. The revision and payload identities do not change.
 */
export const migrateContentRevisions = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { cursor, batchSize = 50 }) => {
    const revisions = await ctx.db.query("contentRevisions").paginate({
      cursor,
      numItems: Math.min(Math.max(batchSize, 1), 100),
    });
    let changed = 0;
    for (const revision of revisions.page) {
      const payload = await ctx.db.get(revision.payloadId);
      if (!payload) continue;
      const migrated = migrateContentRevisionPayload(payload.content);
      if (!migrated) continue;
      const libraryIds = migrated.libraryIds.flatMap((id) => {
        const normalized = ctx.db.normalizeId("documentLibraries", id);
        return normalized ? [normalized] : [];
      });
      const fileIds = migrated.fileIds.flatMap((id) => {
        const normalized = ctx.db.normalizeId("files", id);
        return normalized ? [normalized] : [];
      });
      const pageIds = migrated.pageIds.flatMap((id) => {
        const normalized = ctx.db.normalizeId("pages", id);
        return normalized ? [normalized] : [];
      });
      const searchableText = migratedContentSearchText(migrated.content);
      const site = await ctx.db.get(revision.siteId);
      if (!site) throw new Error("Migration site is missing");
      await recordContentMigrationStorageAdjustment(ctx, {
        organizationId: site.organizationId,
        siteId: site._id,
        contentRevisionId: revision._id,
        previousBytes: revision.contentSize,
        nextBytes: migrated.contentSize,
      });
      await ctx.db.patch(payload._id, {
        content: migrated.content,
        contentHash: migrated.contentHash,
        contentSize: migrated.contentSize,
      });
      await ctx.db.patch(revision._id, {
        contentHash: migrated.contentHash,
        contentSize: migrated.contentSize,
        libraryIds,
        fileIds,
        pageIds,
      });
      const pointers = await ctx.db
        .query("pageDocuments")
        .withIndex("by_revision", (query) =>
          query.eq("revisionId", revision._id),
        )
        .collect();
      for (const pointer of pointers) {
        await ctx.db.patch(pointer._id, {
          contentHash: migrated.contentHash,
          contentSize: migrated.contentSize,
        });
        const page = await ctx.db.get(pointer.pageId);
        if (page && page.deletedAt === undefined) {
          await upsertSearchEntry(ctx, {
            siteId: page.siteId,
            scopeId: draftSearchScope(page.siteId),
            kind: "page",
            sourceId: page._id,
            title: page.title,
            text: searchableText,
          });
        }
      }
      const releasePages = await ctx.db
        .query("releasePages")
        .withIndex("by_content_revision", (query) =>
          query.eq("contentRevisionId", revision._id),
        )
        .collect();
      for (const releasePage of releasePages) {
        await ctx.db.patch(releasePage._id, {
          contentHash: migrated.contentHash,
          descriptionText: searchableText,
        });
        await upsertSearchEntry(ctx, {
          siteId: releasePage.siteId,
          scopeId: releaseSearchScope(releasePage.releaseId),
          kind: "page",
          sourceId: releasePage.pageId,
          title: releasePage.title,
          text: searchableText,
        });
      }
      changed += 1;
    }
    return {
      changed,
      cursor: revisions.continueCursor,
      done: revisions.isDone,
    };
  },
});

/**
 * Verify one migration page without changing stored data. Run pages until done,
 * add their counters, and require every mismatch counter to be zero.
 */
export const auditContentRevisionMigration = internalQuery({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { cursor, batchSize = 50 }) => {
    const revisions = await ctx.db.query("contentRevisions").paginate({
      cursor,
      numItems: Math.min(Math.max(batchSize, 1), 100),
    });
    const totals = {
      revisions: revisions.page.length,
      legacyRevisions: 0,
      revisionMetadataMismatches: 0,
      pointerMetadataMismatches: 0,
      releaseMetadataMismatches: 0,
      draftSearchMismatches: 0,
      releaseSearchMismatches: 0,
      contentPayloadBytes: 0,
      logicalRevisionBytes: 0,
      storageAdjustments: 0,
      invalidStorageAdjustments: 0,
    };
    const failures: string[] = [];
    for (const revision of revisions.page) {
      const payload = await ctx.db.get(revision.payloadId);
      if (!payload) {
        totals.revisionMetadataMismatches += 1;
        failures.push(`${revision._id}:missing-payload`);
        continue;
      }
      if (migrateContentRevisionPayload(payload.content)) {
        totals.legacyRevisions += 1;
        failures.push(`${revision._id}:legacy`);
        continue;
      }
      const contentHash = hashOpenEditorContent(payload.content);
      const contentSize = getConvexSize(payload.content);
      const text = migratedContentSearchText(payload.content);
      totals.contentPayloadBytes += payload.contentSize;
      totals.logicalRevisionBytes += revision.contentSize;
      if (
        payload.contentHash !== contentHash ||
        payload.contentSize !== contentSize ||
        revision.contentHash !== contentHash ||
        revision.contentSize !== contentSize
      ) {
        totals.revisionMetadataMismatches += 1;
        failures.push(`${revision._id}:revision-metadata`);
      }
      const pointers = await ctx.db
        .query("pageDocuments")
        .withIndex("by_revision", (query) =>
          query.eq("revisionId", revision._id),
        )
        .collect();
      for (const pointer of pointers) {
        if (
          pointer.contentHash !== contentHash ||
          pointer.contentSize !== contentSize
        )
          totals.pointerMetadataMismatches += 1;
        const page = await ctx.db.get(pointer.pageId);
        const search = page
          ? await ctx.db
              .query("searchEntries")
              .withIndex("by_scope_source", (query) =>
                query
                  .eq("scopeId", draftSearchScope(page.siteId))
                  .eq("kind", "page")
                  .eq("sourceId", page._id),
              )
              .unique()
          : null;
        if (page?.deletedAt === undefined && search?.text !== text)
          totals.draftSearchMismatches += 1;
      }
      const releasePages = await ctx.db
        .query("releasePages")
        .withIndex("by_content_revision", (query) =>
          query.eq("contentRevisionId", revision._id),
        )
        .collect();
      for (const releasePage of releasePages) {
        if (
          releasePage.contentHash !== contentHash ||
          releasePage.descriptionText !== text
        )
          totals.releaseMetadataMismatches += 1;
        const search = await ctx.db
          .query("searchEntries")
          .withIndex("by_scope_source", (query) =>
            query
              .eq("scopeId", releaseSearchScope(releasePage.releaseId))
              .eq("kind", "page")
              .eq("sourceId", releasePage.pageId),
          )
          .unique();
        if (search?.text !== text) totals.releaseSearchMismatches += 1;
      }
      const site = await ctx.db.get(revision.siteId);
      if (!site) {
        totals.invalidStorageAdjustments += 1;
      } else {
        const adjustment = await ctx.db
          .query("storageUsageEvents")
          .withIndex("by_org_idempotency", (query) =>
            query
              .eq("organizationId", site.organizationId)
              .eq("idempotencyKey", `content:migrate:${revision._id}`),
          )
          .unique();
        if (adjustment) totals.storageAdjustments += 1;
        if (
          adjustment &&
          (adjustment.contentRevisionId !== revision._id ||
            adjustment.kind !== "reconcileAdjustment")
        )
          totals.invalidStorageAdjustments += 1;
      }
    }
    return {
      cursor: revisions.continueCursor,
      done: revisions.isDone,
      totals,
      failures: failures.slice(0, 25),
    };
  },
});
