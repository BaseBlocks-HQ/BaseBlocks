import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "./_generated/dataModel";

type DatabaseContext = Pick<GenericMutationCtx<DataModel>, "db">;

const stableId = () => crypto.randomUUID();

export async function createDefaultPageStructure(
  ctx: DatabaseContext,
  args: { siteId: Id<"sites">; pageId: Id<"pages">; now?: number },
) {
  const now = args.now ?? Date.now();
  const firstColumnId = stableId();
  await ctx.db.insert("pageContents", {
    siteId: args.siteId,
    pageId: args.pageId,
    tabs: [],
    sections: [
      {
        id: stableId(),
        region: "main",
        order: 0,
        columns: [{ id: firstColumnId, order: 0, blocks: [] }],
      },
    ],
    updatedAt: now,
  });
  return firstColumnId;
}

export async function deletePageStructure(
  ctx: DatabaseContext,
  pageId: Id<"pages">,
) {
  const content = await ctx.db
    .query("pageContents")
    .withIndex("by_page", (q) => q.eq("pageId", pageId))
    .unique();
  if (content) await ctx.db.delete("pageContents", content._id);
}
