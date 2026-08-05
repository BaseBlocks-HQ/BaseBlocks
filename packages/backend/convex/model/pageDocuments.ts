import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import {
  emptyOpenEditorDocument,
  parseOpenEditorDocument,
  type OpenEditorDocument,
} from "../pageContentFormat";

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
