import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api.js";
import type { DataModel } from "./_generated/dataModel.js";
import { extractBlockNoteText } from "./lib/extractBlockNoteText.js";
import { isExtractable } from "./lib/extractable.js";

export const migrations = new Migrations<DataModel>(components.migrations);

// Define the subpage content type
interface SubpageContent {
  title?: string;
  description?: string;
  content?: unknown[];
}

// Migration 1: Index all existing subpages from layouts
export const indexSubpages = migrations.define({
  table: "layouts",
  batchSize: 20, // Layouts can be large with nested content
  migrateOne: async (ctx, layout) => {
    // Get the page to find the siteId
    const page = await ctx.db.get(layout.pageId);
    if (!page) return;

    // Process all slots and blocks
    for (const slot of layout.slots) {
      for (const block of slot.blocks) {
        if (block.type === "subpage" && block.content) {
          const content = block.content as SubpageContent;
          const sourceId = `${layout._id}:${slot.id}:${block.id}`;

          // Check if already indexed
          const existing = await ctx.db
            .query("searchableContent")
            .withIndex("by_source", (q) =>
              q.eq("contentType", "subpage").eq("sourceId", sourceId)
            )
            .first();

          if (!existing) {
            const extractedText = extractBlockNoteText(content.content);
            const combinedText =
              `${content.title || ""} ${content.description || ""} ${extractedText}`.trim();

            // Only index if there's meaningful content
            if (combinedText.length > 0) {
              await ctx.db.insert("searchableContent", {
                siteId: page.siteId,
                contentType: "subpage",
                sourceId,
                title: content.title || "Untitled",
                extractedText: combinedText,
                metadata: {
                  pageId: page._id,
                  layoutId: layout._id,
                  blockId: block.id,
                  slotId: slot.id,
                  description: content.description,
                },
                updatedAt: Date.now(),
              });
            }
          }
        }
      }
    }
  },
});

// Migration 2: Index existing documents with extracted text
export const indexDocuments = migrations.define({
  table: "documents",
  batchSize: 50,
  migrateOne: async (ctx, doc) => {
    // Only index documents that have extracted text
    if (!doc.extractedText) return;

    // Check if already indexed
    const existing = await ctx.db
      .query("searchableContent")
      .withIndex("by_source", (q) =>
        q.eq("contentType", "document").eq("sourceId", doc._id)
      )
      .first();

    if (!existing) {
      await ctx.db.insert("searchableContent", {
        siteId: doc.siteId,
        contentType: "document",
        sourceId: doc._id,
        title: doc.filename,
        extractedText: doc.extractedText,
        metadata: {
          filename: doc.filename,
          fileContentType: doc.contentType,
          size: doc.size,
          cdnUrl: doc.cdnUrl,
          libraryId: doc.libraryId,
        },
        updatedAt: Date.now(),
      });
    }
  },
});

// Migration 3: Fix documents stuck as "pending" that are non-extractable (images, csv, etc.)
// Sets them to "unsupported" so they don't appear as awaiting extraction
export const fixPendingNonExtractable = migrations.define({
  table: "documents",
  batchSize: 50,
  migrateOne: async (ctx, doc) => {
    if (doc.extractionStatus === "pending" && !isExtractable(doc.contentType)) {
      await ctx.db.patch(doc._id, {
        extractionStatus: "unsupported",
        extractionError: `Content type ${doc.contentType} does not support text extraction`,
      });
    }
  },
});

// Migration 4: Index ALL documents in searchableContent (not just extracted ones)
// Ensures every document is findable by filename, even if extraction failed/unsupported
export const indexAllDocuments = migrations.define({
  table: "documents",
  batchSize: 50,
  migrateOne: async (ctx, doc) => {
    // Check if already indexed
    const existing = await ctx.db
      .query("searchableContent")
      .withIndex("by_source", (q) =>
        q.eq("contentType", "document").eq("sourceId", doc._id)
      )
      .first();

    if (existing) return; // Already indexed, skip

    // Use extracted text if available, otherwise fall back to filename
    const extractedText = doc.extractedText || doc.filename;

    await ctx.db.insert("searchableContent", {
      siteId: doc.siteId,
      contentType: "document",
      sourceId: doc._id,
      title: doc.filename,
      extractedText,
      metadata: {
        filename: doc.filename,
        fileContentType: doc.contentType,
        size: doc.size,
        cdnUrl: doc.cdnUrl,
        libraryId: doc.libraryId,
      },
      updatedAt: Date.now(),
    });
  },
});

// Runner for all migrations - run in order
export const runAll = migrations.runner([
  internal.migrations.indexSubpages,
  internal.migrations.indexDocuments,
]);

// Runner for the new fix migrations (run these for existing data)
export const runSearchFixes = migrations.runner([
  internal.migrations.fixPendingNonExtractable,
  internal.migrations.indexAllDocuments,
]);

// Individual runners for testing
export const runSubpages = migrations.runner([internal.migrations.indexSubpages]);
export const runDocuments = migrations.runner([internal.migrations.indexDocuments]);
export const runFixPending = migrations.runner([internal.migrations.fixPendingNonExtractable]);
export const runIndexAll = migrations.runner([internal.migrations.indexAllDocuments]);
