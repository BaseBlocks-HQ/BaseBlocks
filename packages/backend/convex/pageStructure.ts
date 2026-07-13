import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "./_generated/dataModel";
import { emptyOpenEditorDocument } from "./openEditorDocuments";

type DatabaseContext = Pick<GenericMutationCtx<DataModel>, "db">;

export async function createDefaultPageStructure(
  ctx: DatabaseContext,
  args: { siteId: Id<"sites">; pageId: Id<"pages">; now?: number },
) {
  const now = args.now ?? Date.now();
  await ctx.db.insert("openEditorPageContents", {
    siteId: args.siteId,
    pageId: args.pageId,
    document: JSON.stringify(emptyOpenEditorDocument()),
    updatedAt: now,
  });
}

export async function deletePageStructure(
  ctx: DatabaseContext,
  pageId: Id<"pages">,
) {
  const content = await ctx.db
    .query("openEditorPageContents")
    .withIndex("by_page", (q) => q.eq("pageId", pageId))
    .unique();
  if (content) {
    await ctx.db.delete("openEditorPageContents", content._id);
  }
}
