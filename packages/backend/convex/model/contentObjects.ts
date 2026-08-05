import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";
import {
  extractOpenEditorReferences,
  type OpenEditorDocument,
} from "../pageContentFormat";

type MutationCtx = Pick<GenericMutationCtx<DataModel>, "db">;

export async function getOrCreateContentObject(
  ctx: MutationCtx,
  value: {
    siteId: Id<"sites">;
    content: string;
    contentHash: string;
    contentSize: number;
    document: OpenEditorDocument;
    createdAt: number;
  },
) {
  const existing = await ctx.db
    .query("contentRevisions")
    .withIndex("by_site_hash", (q) =>
      q.eq("siteId", value.siteId).eq("contentHash", value.contentHash),
    )
    .first();
  if (existing) {
    const payload = await ctx.db.get(existing.payloadId);
    if (!payload || payload.content !== value.content) {
      throw new Error("Content hash collision");
    }
    return {
      revisionId: existing._id,
      libraryIds: existing.libraryIds,
      fileIds: existing.fileIds,
      pageIds: existing.pageIds,
    };
  }

  const references = extractOpenEditorReferences(value.document);
  const libraryIds = Array.from(references.libraryIds)
    .flatMap((id) => {
      const normalized = ctx.db.normalizeId("documentLibraries", id);
      return normalized ? [normalized] : [];
    })
    .sort();
  const fileIds = Array.from(references.fileIds)
    .flatMap((id) => {
      const normalized = ctx.db.normalizeId("files", id);
      return normalized ? [normalized] : [];
    })
    .sort();
  const pageIds = Array.from(references.pageIds)
    .flatMap((id) => {
      const normalized = ctx.db.normalizeId("pages", id);
      return normalized ? [normalized] : [];
    })
    .sort();

  const payloadId = await ctx.db.insert("contentPayloads", {
    siteId: value.siteId,
    content: value.content,
    contentHash: value.contentHash,
    contentSize: value.contentSize,
    createdAt: value.createdAt,
  });
  const revisionId = await ctx.db.insert("contentRevisions", {
    siteId: value.siteId,
    contentHash: value.contentHash,
    contentSize: value.contentSize,
    payloadId,
    libraryIds,
    fileIds,
    pageIds,
    createdAt: value.createdAt,
  });
  return { revisionId, libraryIds, fileIds, pageIds };
}

export function contentObjectReferences(value: {
  libraryIds?: Id<"documentLibraries">[];
  fileIds?: Id<"files">[];
}) {
  const libraryIds = [...(value.libraryIds ?? [])].sort();
  const fileIds = [...(value.fileIds ?? [])].sort();
  return {
    key: `${libraryIds.join(",")}|${fileIds.join(",")}`,
    libraryIds,
    fileIds,
  };
}
