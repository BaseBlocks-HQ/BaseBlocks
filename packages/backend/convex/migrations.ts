import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";

function replaceIds(value: unknown, ids: Map<string, string>): unknown {
  if (typeof value === "string") return ids.get(value) ?? value;
  if (Array.isArray(value)) return value.map((item) => replaceIds(item, ids));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, replaceIds(item, ids)]),
  );
}

export const mergeDocumentsIntoFiles = internalMutation({
  args: {},
  returns: v.object({ files: v.number(), pageContents: v.number() }),
  handler: async (ctx) => {
    const documents = await ctx.db.query("documents").collect();
    const ids = new Map<string, string>();

    for (const document of documents) {
      const file = await ctx.db.get(document.fileId);
      if (!file) continue;
      ids.set(document._id, file._id);
      await ctx.db.patch(file._id, {
        kind: "file",
        libraryId: document.libraryId,
        folderId: document.folderId,
        filename: document.filename,
        contentType: document.contentType,
        size: document.size,
        uploadedBy: document.uploadedBy,
        createdAt: document.createdAt,
      });
      const entry = await ctx.db
        .query("searchEntries")
        .withIndex("by_source", (q) =>
          q.eq("kind", "document").eq("sourceId", document._id),
        )
        .first();
      if (entry) {
        await ctx.db.patch(entry._id, {
          kind: "file",
          sourceId: file._id,
          title: document.filename,
          text: document.filename,
        });
      }
    }

    let changedContents = 0;
    const contents = await ctx.db.query("openEditorPageContents").collect();
    for (const content of contents) {
      const parsed = JSON.parse(content.document) as unknown;
      const migrated = replaceIds(parsed, ids);
      const serialized = JSON.stringify(migrated);
      if (serialized !== content.document) {
        await ctx.db.patch(content._id, { document: serialized });
        changedContents += 1;
      }
    }

    const references = await ctx.db.query("pageReferences").collect();
    for (const reference of references) {
      const fileIds = new Set<Id<"files">>(reference.fileIds ?? []);
      for (const documentId of reference.documentIds ?? []) {
        const fileId = ids.get(documentId);
        const normalized = fileId ? ctx.db.normalizeId("files", fileId) : null;
        if (normalized) fileIds.add(normalized);
      }
      await ctx.db.patch(reference._id, {
        fileIds: [...fileIds],
        documentIds: [],
      });
    }

    for (const document of documents) await ctx.db.delete(document._id);
    return { files: ids.size, pageContents: changedContents };
  },
});

export const movePageContents = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const rows = await ctx.db.query("openEditorPageContents").collect();
    for (const row of rows) {
      const existing = await ctx.db
        .query("pageContents")
        .withIndex("by_page", (q) => q.eq("pageId", row.pageId))
        .unique();
      const value = {
        siteId: row.siteId,
        pageId: row.pageId,
        content: row.document,
        updatedAt: row.updatedAt,
      };
      if (existing) await ctx.db.patch(existing._id, value);
      else await ctx.db.insert("pageContents", value);
      await ctx.db.delete(row._id);
    }
    return rows.length;
  },
});
