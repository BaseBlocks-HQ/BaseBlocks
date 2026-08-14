import { getConvexSize } from "convex/values";
import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import {
  emptyOpenEditorDocument,
  hashOpenEditorContent,
  parseOpenEditorDocument,
  type OpenEditorDocument,
} from "../pageContentFormat";
import { getOrCreateContentObject } from "./contentObjects";
import { synchronizeDraftPageSiteAssets } from "./siteAssets";

type DbCtx = Pick<
  GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>,
  "db"
>;

export async function getPageDocument(
  ctx: DbCtx,
  pageId: Id<"pages">,
): Promise<Doc<"pageDocuments"> | null> {
  return ctx.db
    .query("pageDocuments")
    .withIndex("by_page", (q) => q.eq("pageId", pageId))
    .unique();
}

export async function readPageContent(
  ctx: DbCtx,
  pageId: Id<"pages">,
): Promise<{
  document: OpenEditorDocument;
  record: Doc<"pageDocuments"> | null;
}> {
  const record = await getPageDocument(ctx, pageId);
  if (!record) {
    return { document: emptyOpenEditorDocument(), record: null };
  }
  return {
    document: await readPageDocumentRecord(ctx, record),
    record,
  };
}

export async function readPageDocumentRecord(
  ctx: DbCtx,
  record: Doc<"pageDocuments">,
): Promise<OpenEditorDocument> {
  const revision = await ctx.db.get(record.revisionId);
  const payload = revision ? await ctx.db.get(revision.payloadId) : null;
  return payload
    ? parseOpenEditorDocument(payload.content)
    : emptyOpenEditorDocument();
}

export const MAX_PAGE_CONTENT_BYTES = 900_000;

export async function writePageContent(
  ctx: Pick<GenericMutationCtx<DataModel>, "db">,
  pageId: Id<"pages">,
  document: OpenEditorDocument,
  updatedAt = Date.now(),
) {
  const page = await ctx.db.get(pageId);
  if (!page || page.deletedAt !== undefined) throw new Error("Page not found");
  const serialized = JSON.stringify(document);
  const contentSize = getConvexSize(serialized);
  if (contentSize > MAX_PAGE_CONTENT_BYTES) {
    throw new Error("This page is too large. Split it into child pages.");
  }
  const contentHash = hashOpenEditorContent(serialized);
  const existing = await getPageDocument(ctx, pageId);
  if (existing?.contentHash === contentHash) {
    return { contentHash, revisionId: existing.revisionId, changed: false };
  }
  const previousRevision = existing
    ? await ctx.db.get(existing.revisionId)
    : null;
  const { revisionId, fileIds } = await getOrCreateContentObject(ctx, {
    siteId: page.siteId,
    content: serialized,
    contentHash,
    contentSize,
    document,
    createdAt: updatedAt,
  });
  if (existing) {
    await ctx.db.patch(existing._id, {
      revisionId,
      contentHash,
      contentSize,
      updatedAt,
    });
  } else {
    await ctx.db.insert("pageDocuments", {
      siteId: page.siteId,
      pageId,
      revisionId,
      contentHash,
      contentSize,
      updatedAt,
    });
  }
  await synchronizeDraftPageSiteAssets(
    ctx,
    page.siteId,
    previousRevision?.fileIds ?? [],
    fileIds,
    updatedAt,
  );
  return { contentHash, revisionId, changed: true };
}
