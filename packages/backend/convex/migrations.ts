import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api.js";
import type { DataModel } from "./_generated/dataModel.js";
import { extractBlockNoteText } from "./lib/extractBlockNoteText.js";

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

// Runner for all migrations - run in order
export const runAll = migrations.runner([
  internal.migrations.indexSubpages,
  internal.migrations.indexDocuments,
]);

// Individual runners for testing
export const runSubpages = migrations.runner([internal.migrations.indexSubpages]);
export const runDocuments = migrations.runner([internal.migrations.indexDocuments]);
