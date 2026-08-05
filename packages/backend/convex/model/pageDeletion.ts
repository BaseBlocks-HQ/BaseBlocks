import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";
import { removePageContentIndex } from "../search";

type MutationCtx = GenericMutationCtx<DataModel>;

export async function softDeletePageSubtree(
  ctx: MutationCtx,
  pageId: Id<"pages">,
  now = Date.now(),
) {
  const page = await ctx.db.get(pageId);
  if (!page || page.deletedAt !== undefined) {
    return { deletedPageIds: [] as Id<"pages">[], defaultChanged: false };
  }
  const site = await ctx.db.get(page.siteId);
  if (!site) throw new Error("Site not found");
  const allPages = (
    await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", page.siteId))
      .collect()
  ).filter((candidate) => candidate.deletedAt === undefined);
  const deleted = new Set<Id<"pages">>([pageId]);
  const collectDescendants = (parentId: Id<"pages">) => {
    for (const child of allPages) {
      if (child.parentId !== parentId || deleted.has(child._id)) continue;
      deleted.add(child._id);
      collectDescendants(child._id);
    }
  };
  collectDescendants(pageId);

  const defaultChanged = site.defaultPageId
    ? deleted.has(site.defaultPageId)
    : false;
  if (defaultChanged) {
    const remaining = allPages
      .filter((candidate) => !deleted.has(candidate._id))
      .sort((left, right) => left.order - right.order);
    const replacement =
      remaining.find((candidate) => !candidate.parentId) ?? remaining[0];
    await ctx.db.patch(site._id, {
      defaultPageId: replacement?._id,
      updatedAt: now,
    });
  }

  for (const id of deleted) {
    await removePageContentIndex(ctx, id);
    await ctx.db.patch(id, { deletedAt: now, updatedAt: now });
  }
  return { deletedPageIds: [...deleted], defaultChanged };
}
