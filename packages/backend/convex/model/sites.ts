import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";

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
  const references = await ctx.db
    .query("pageReferences")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .collect();
  const allowedPageIds = pageIds ? new Set(pageIds) : null;
  const libraryIds = new Set<string>();

  for (const reference of references) {
    if (allowedPageIds && !allowedPageIds.has(reference.pageId)) continue;
    for (const libraryId of reference.libraryIds) libraryIds.add(libraryId);
  }

  return libraryIds;
}
