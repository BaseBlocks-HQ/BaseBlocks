import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";
import { synchronizeOpenEditorChildPages } from "../pageContentFormat";
import { queuePageContentIndex } from "../search";
import { touchSiteDraft } from "./draft";
import { readPageContent, writePageContent } from "./pageDocuments";

type MutationCtx = Pick<GenericMutationCtx<DataModel>, "db" | "scheduler">;

export async function synchronizeParentDocument(
  ctx: MutationCtx,
  parentId: Id<"pages">,
  updatedAt = Date.now(),
  options: { touchDraft?: boolean } = {},
) {
  const parent = await ctx.db.get(parentId);
  if (!parent || parent.deletedAt !== undefined) return false;
  const children = (
    await ctx.db
      .query("pages")
      .withIndex("by_parent_order", (q) =>
        q.eq("siteId", parent.siteId).eq("parentId", parentId),
      )
      .collect()
  ).filter((page) => page.deletedAt === undefined);
  const current = (await readPageContent(ctx, parentId)).document;
  const synchronized = synchronizeOpenEditorChildPages(
    current,
    children.map((page) => ({
      pageId: page._id,
      title: page.title,
      icon: page.icon,
    })),
  );
  const result = await writePageContent(ctx, parentId, synchronized, updatedAt);
  if (!result.changed) return false;
  if (options.touchDraft !== false) {
    await touchSiteDraft(ctx, parent.siteId, updatedAt, [
      { entityType: "page", entityId: parentId },
    ]);
  }
  await queuePageContentIndex(
    ctx as GenericMutationCtx<DataModel>,
    parentId,
    result.revisionId,
    result.contentHash,
  );
  return true;
}
