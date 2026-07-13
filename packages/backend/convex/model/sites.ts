import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";
import {
  collectOpenEditorAttributeValues,
  parseOpenEditorDocument,
} from "../openEditorDocuments";

type DbCtx = Pick<
  GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>,
  "db"
>;

export async function resolveSiteContext(
  ctx: DbCtx,
  siteId: Id<"sites">,
): Promise<{ organizationId: string } | null> {
  const site = await ctx.db.get(siteId);
  return site ? { organizationId: site.organizationId } : null;
}

export function getActiveLibraryIds(ctx: DbCtx, siteId: Id<"sites">) {
  return getActiveLibraryIdsForPageIds(ctx, siteId);
}

export async function getActiveLibraryIdsForPageIds(
  ctx: DbCtx,
  siteId: Id<"sites">,
  pageIds?: Iterable<string>,
): Promise<Set<string>> {
  const contents = await ctx.db
    .query("openEditorPageContents")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .collect();
  const allowedPageIds = pageIds ? new Set(pageIds) : null;
  const libraryIds = new Set<string>();

  for (const content of contents) {
    if (allowedPageIds && !allowedPageIds.has(content.pageId)) continue;
    for (const libraryId of collectOpenEditorAttributeValues(
      parseOpenEditorDocument(content.document),
      "baseblocksLibrary",
      ["library", "libraryId"],
    )) {
      libraryIds.add(libraryId);
    }
  }

  return libraryIds;
}
