import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";

/**
 * Database context type — works for both queries and mutations.
 * Replaces the unsafe `ctx: { db: any }` pattern used previously.
 */
type DbCtx = Pick<
  GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>,
  "db"
>;

/**
 * Resolved page info with properly typed IDs.
 */
export type PageInfo = {
  teamId: Id<"teams">;
  siteId: Id<"sites">;
};

/**
 * Resolve a page's team and site IDs.
 * Returns null if page or site doesn't exist.
 */
export async function resolvePageContext(
  ctx: DbCtx,
  pageId: Id<"pages">,
): Promise<PageInfo | null> {
  const page = await ctx.db.get(pageId);
  if (!page) return null;

  const site = await ctx.db.get(page.siteId);
  if (!site) return null;

  return { teamId: site.teamId, siteId: site._id };
}

/**
 * Resolve a site's team ID.
 * Returns null if site doesn't exist.
 */
export async function resolveSiteContext(
  ctx: DbCtx,
  siteId: Id<"sites">,
): Promise<{ teamId: Id<"teams"> } | null> {
  const site = await ctx.db.get(siteId);
  if (!site) return null;

  return { teamId: site.teamId };
}

export async function getActiveLibraryIds(
  ctx: DbCtx,
  siteId: Id<"sites">,
): Promise<Set<string>> {
  return getActiveLibraryIdsForPageIds(ctx, siteId);
}

export async function getActiveLibraryIdsForPageIds(
  ctx: DbCtx,
  siteId: Id<"sites">,
  pageIds?: Iterable<string>,
): Promise<Set<string>> {
  const pages = await ctx.db
    .query("pages")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .collect();

  const allowedPageIds = pageIds ? new Set(pageIds) : null;
  const activeLibraryIds = new Set<string>();
  const scanBlocks = (blocks: unknown[]) => {
    for (const block of blocks) {
      if (typeof block !== "object" || block === null) continue;

      if (
        "type" in block &&
        block.type === "library" &&
        "content" in block &&
        typeof block.content === "object" &&
        block.content !== null &&
        "libraryId" in block.content &&
        typeof block.content.libraryId === "string"
      ) {
        activeLibraryIds.add(block.content.libraryId);
      }

      if ("columns" in block && Array.isArray(block.columns)) {
        for (const column of block.columns) {
          if (
            typeof column === "object" &&
            column !== null &&
            "blocks" in column &&
            Array.isArray(column.blocks)
          ) {
            scanBlocks(column.blocks);
          }
        }
      }

      if ("tabs" in block && Array.isArray(block.tabs)) {
        for (const tab of block.tabs) {
          if (
            typeof tab === "object" &&
            tab !== null &&
            "blocks" in tab &&
            Array.isArray(tab.blocks)
          ) {
            scanBlocks(tab.blocks);
          }
        }
      }
    }
  };

  for (const page of pages) {
    if (allowedPageIds && !allowedPageIds.has(page._id)) {
      continue;
    }

    scanBlocks(page.publishedContent?.blocks ?? []);
  }

  return activeLibraryIds;
}
