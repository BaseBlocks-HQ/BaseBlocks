import { ConvexError, v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { buildDocumentSearchMetadata } from "../documents/searchMetadata";
import { resolveSiteContext } from "../sites/resolvers";

export const rebuildDocumentSearchMetadata = internalMutation({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, { siteId }) => {
    const siteCtx = await resolveSiteContext(ctx, siteId);
    if (!siteCtx) {
      throw new ConvexError("Site not found");
    }

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    let updatedCount = 0;
    for (const document of documents) {
      const entry = await ctx.db
        .query("searchableContent")
        .withIndex("by_source", (q) =>
          q.eq("contentType", "document").eq("sourceId", document._id),
        )
        .first();

      if (!entry) {
        continue;
      }

      await ctx.db.patch(entry._id, {
        metadata: buildDocumentSearchMetadata({
          documentId: document._id,
          assetId: document.assetId,
          filename: document.filename,
          contentType: document.contentType,
          size: document.size,
          libraryId: document.libraryId,
        }),
        updatedAt: Date.now(),
      });
      updatedCount++;
    }

    return {
      updatedCount,
    };
  },
});

export const pruneOrphanedDocumentEntries = internalMutation({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("searchableContent").collect();
    let deletedCount = 0;

    for (const entry of entries) {
      if (entry.contentType !== "document") {
        continue;
      }

      const site = await ctx.db.get(entry.siteId);
      const document = await ctx.db.get(entry.sourceId as never);
      if (site && document) {
        continue;
      }

      await ctx.db.delete(entry._id);
      deletedCount++;
    }

    return {
      deletedCount,
    };
  },
});
