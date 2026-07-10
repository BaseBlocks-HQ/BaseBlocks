import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  internalAction,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

const BATCH_SIZE = 25;

async function buildLegacyContent(
  ctx: Pick<QueryCtx | MutationCtx, "db">,
  page: Doc<"pages">,
) {
  const [sections, columns, blocks] = await Promise.all([
    ctx.db
      .query("sections")
      .withIndex("by_page", (q) => q.eq("pageId", page._id))
      .collect(),
    ctx.db
      .query("columns")
      .withIndex("by_page", (q) => q.eq("pageId", page._id))
      .collect(),
    ctx.db
      .query("blocks")
      .withIndex("by_page", (q) => q.eq("pageId", page._id))
      .collect(),
  ]);

  const legacyPage = page as Doc<"pages"> & {
    pageTabs?: Array<{ id: string; label: string }>;
  };
  return {
    tabs: legacyPage.pageTabs ?? [],
    sections: sections
      .sort((a, b) => a.order - b.order)
      .map((section, sectionOrder) => ({
        id: section._id as string,
        tabId: section.tabId,
        region: section.region,
        order: sectionOrder,
        columns: columns
          .filter((column) => column.sectionId === section._id)
          .sort((a, b) => a.order - b.order)
          .map((column, columnOrder) => ({
            id: column._id as string,
            order: columnOrder,
            blocks: blocks
              .filter((block) => block.columnId === column._id)
              .sort((a, b) => a.order - b.order)
              .map((block, blockOrder) => ({
                id: block._id as string,
                type: block.type,
                content: block.content,
                order: blockOrder,
              })),
          })),
      })),
  };
}

export const migratePageContents = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.object({
    processed: v.number(),
    created: v.number(),
    skipped: v.number(),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, { cursor }) => {
    const result = await ctx.db
      .query("pages")
      .paginate({ cursor: cursor ?? null, numItems: BATCH_SIZE });
    let created = 0;
    let skipped = 0;

    for (const page of result.page) {
      const content = await buildLegacyContent(ctx, page);
      const existing = await ctx.db
        .query("pageContents")
        .withIndex("by_page", (q) => q.eq("pageId", page._id))
        .unique();
      const updatedAt = Date.now();
      if (existing) {
        skipped += 1;
      } else {
        await ctx.db.insert("pageContents", {
          siteId: page.siteId,
          pageId: page._id,
          ...content,
          updatedAt,
        });
        created += 1;
      }
    }

    if (!result.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.migratePageContents, {
        cursor: result.continueCursor,
      });
    }

    return {
      processed: result.page.length,
      created,
      skipped,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const verifyPageContents = internalQuery({
  args: { cursor: v.optional(v.string()) },
  returns: v.object({
    checked: v.number(),
    missing: v.array(v.id("pages")),
    mismatched: v.array(v.id("pages")),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, { cursor }) => {
    const result = await ctx.db
      .query("pages")
      .paginate({ cursor: cursor ?? null, numItems: BATCH_SIZE });
    const missing: Array<Id<"pages">> = [];
    const mismatched: Array<Id<"pages">> = [];

    for (const page of result.page) {
      const expected = await buildLegacyContent(ctx, page);
      const actual = await ctx.db
        .query("pageContents")
        .withIndex("by_page", (q) => q.eq("pageId", page._id))
        .unique();
      if (!actual) {
        missing.push(page._id);
      } else if (
        JSON.stringify({ tabs: actual.tabs, sections: actual.sections }) !==
        JSON.stringify(expected)
      ) {
        mismatched.push(page._id);
      }
    }

    return {
      checked: result.page.length,
      missing,
      mismatched,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

const batchSize = 100;

const stageResult = v.object({
  processed: v.number(),
  done: v.boolean(),
  cursor: v.string(),
});

export const phase5CopyAssets = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: stageResult,
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db
      .query("assets")
      .paginate({ cursor: cursor ?? null, numItems: batchSize });
    let processed = 0;
    for (const asset of page.page) {
      const existing = await ctx.db
        .query("files")
        .withIndex("by_legacy_asset", (q) => q.eq("legacyAssetId", asset._id))
        .unique();
      if (existing) continue;
      await ctx.db.insert("files", {
        siteId: asset.siteId,
        kind: asset.kind,
        visibility: asset.visibility,
        objectKey: asset.objectKey,
        filename: asset.filename,
        contentType: asset.contentType,
        size: asset.size,
        checksum: asset.checksum,
        uploadedBy: asset.uploadedBy,
        createdAt: asset.createdAt,
        legacyAssetId: asset._id,
      });
      processed += 1;
    }
    return { processed, done: page.isDone, cursor: page.continueCursor };
  },
});

export const phase5PatchDocuments = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: stageResult,
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db
      .query("documents")
      .paginate({ cursor: cursor ?? null, numItems: batchSize });
    let processed = 0;
    for (const document of page.page) {
      if (document.fileId || !document.assetId) continue;
      const file = await ctx.db
        .query("files")
        .withIndex("by_legacy_asset", (q) =>
          q.eq("legacyAssetId", document.assetId),
        )
        .unique();
      if (!file)
        throw new Error(`Missing migrated file for document ${document._id}`);
      await ctx.db.patch(document._id, { fileId: file._id });
      processed += 1;
    }
    return { processed, done: page.isDone, cursor: page.continueCursor };
  },
});

export const phase5PatchSites = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: stageResult,
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db
      .query("sites")
      .paginate({ cursor: cursor ?? null, numItems: batchSize });
    let processed = 0;
    for (const site of page.page) {
      if (site.logoFileId || !site.logoAssetId) continue;
      const file = await ctx.db
        .query("files")
        .withIndex("by_legacy_asset", (q) =>
          q.eq("legacyAssetId", site.logoAssetId),
        )
        .unique();
      if (!file) throw new Error(`Missing migrated logo for site ${site._id}`);
      await ctx.db.patch(site._id, { logoFileId: file._id });
      processed += 1;
    }
    return { processed, done: page.isDone, cursor: page.continueCursor };
  },
});

export const phase5PatchSearch = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: stageResult,
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db
      .query("searchableContent")
      .paginate({ cursor: cursor ?? null, numItems: batchSize });
    let processed = 0;
    for (const entry of page.page) {
      const legacyId = entry.metadata.assetId;
      if (entry.metadata.fileId || !legacyId) continue;
      const file = await ctx.db
        .query("files")
        .withIndex("by_legacy_asset", (q) => q.eq("legacyAssetId", legacyId))
        .unique();
      if (!file)
        throw new Error(`Missing migrated search file for ${entry._id}`);
      await ctx.db.patch(entry._id, {
        metadata: { ...entry.metadata, fileId: file._id },
      });
      processed += 1;
    }
    return { processed, done: page.isDone, cursor: page.continueCursor };
  },
});

export const phase5Verify = internalQuery({
  args: {},
  returns: v.object({
    assets: v.number(),
    migratedFiles: v.number(),
    unmigratedDocuments: v.number(),
    unmigratedSites: v.number(),
    unmigratedSearchEntries: v.number(),
    danglingDocumentFiles: v.number(),
  }),
  handler: async (ctx) => {
    const [assets, files, documents, sites, entries] = await Promise.all([
      ctx.db.query("assets").collect(),
      ctx.db.query("files").collect(),
      ctx.db.query("documents").collect(),
      ctx.db.query("sites").collect(),
      ctx.db.query("searchableContent").collect(),
    ]);
    let danglingDocumentFiles = 0;
    for (const document of documents) {
      if (document.fileId && !(await ctx.db.get(document.fileId))) {
        danglingDocumentFiles += 1;
      }
    }
    return {
      assets: assets.length,
      migratedFiles: files.filter((file) => file.legacyAssetId).length,
      unmigratedDocuments: documents.filter((doc) => doc.assetId && !doc.fileId)
        .length,
      unmigratedSites: sites.filter(
        (site) => site.logoAssetId && !site.logoFileId,
      ).length,
      unmigratedSearchEntries: entries.filter(
        (entry) => entry.metadata.assetId && !entry.metadata.fileId,
      ).length,
      danglingDocumentFiles,
    };
  },
});

export const phase5Run = internalAction({
  args: {},
  returns: v.object({
    copiedAssets: v.number(),
    patchedDocuments: v.number(),
    patchedSites: v.number(),
    patchedSearchEntries: v.number(),
  }),
  handler: async (ctx) => {
    const stages = [
      internal.migrations.phase5CopyAssets,
      internal.migrations.phase5PatchDocuments,
      internal.migrations.phase5PatchSites,
      internal.migrations.phase5PatchSearch,
    ] as const;
    const totals: number[] = [];
    for (const stage of stages) {
      let cursor: string | undefined;
      let processed = 0;
      while (true) {
        const result = await ctx.runMutation(stage, { cursor });
        processed += result.processed;
        if (result.done) break;
        cursor = result.cursor;
      }
      totals.push(processed);
    }
    return {
      copiedAssets: totals[0] ?? 0,
      patchedDocuments: totals[1] ?? 0,
      patchedSites: totals[2] ?? 0,
      patchedSearchEntries: totals[3] ?? 0,
    };
  },
});
