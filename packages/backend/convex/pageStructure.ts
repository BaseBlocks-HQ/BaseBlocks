import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "./_generated/dataModel";

type DatabaseContext = Pick<GenericMutationCtx<DataModel>, "db">;

export async function createDefaultPageStructure(
  ctx: DatabaseContext,
  args: {
    siteId: Id<"sites">;
    pageId: Id<"pages">;
    now?: number;
  },
) {
  const now = args.now ?? Date.now();
  const sectionId = await ctx.db.insert("sections", {
    siteId: args.siteId,
    pageId: args.pageId,
    region: "main",
    order: 0,
    createdAt: now,
    updatedAt: now,
  });
  return ctx.db.insert("columns", {
    siteId: args.siteId,
    pageId: args.pageId,
    sectionId,
    order: 0,
    createdAt: now,
  });
}

export async function deletePageStructure(
  ctx: DatabaseContext,
  pageId: Id<"pages">,
) {
  const [blocks, columns, sections] = await Promise.all([
    ctx.db
      .query("blocks")
      .withIndex("by_page", (query) => query.eq("pageId", pageId))
      .collect(),
    ctx.db
      .query("columns")
      .withIndex("by_page", (query) => query.eq("pageId", pageId))
      .collect(),
    ctx.db
      .query("sections")
      .withIndex("by_page", (query) => query.eq("pageId", pageId))
      .collect(),
  ]);
  await Promise.all([
    ...blocks.map((block) => ctx.db.delete(block._id)),
    ...columns.map((column) => ctx.db.delete(column._id)),
    ...sections.map((section) => ctx.db.delete(section._id)),
  ]);
}
