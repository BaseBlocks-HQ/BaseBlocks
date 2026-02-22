import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Doc, Id } from "../_generated/dataModel";

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
 * Resolved layout info with properly typed IDs.
 */
export type LayoutInfo = {
  teamId: Id<"teams">;
  siteId: Id<"sites">;
  pageId: Id<"pages">;
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
 * Resolve a layout's team, site, and page IDs.
 * Returns null if layout, page, or site doesn't exist.
 */
export async function resolveLayoutContext(
  ctx: DbCtx,
  layoutId: Id<"layouts">,
): Promise<LayoutInfo | null> {
  const layout = await ctx.db.get(layoutId);
  if (!layout) return null;

  const page = await ctx.db.get(layout.pageId);
  if (!page) return null;

  const site = await ctx.db.get(page.siteId);
  if (!site) return null;

  return { teamId: site.teamId, siteId: site._id, pageId: layout.pageId };
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

/**
 * Collect library IDs that are actively used in published blocks across a site.
 * Uses the layouts by_site index for O(1) query instead of N+1 per-page lookups.
 */
export async function getActiveLibraryIds(
  ctx: DbCtx,
  siteId: Id<"sites">,
): Promise<Set<string>> {
  // Single query via denormalized siteId on layouts
  const layouts = await ctx.db
    .query("layouts")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .collect();

  const activeLibraryIds = new Set<string>();
  for (const layout of layouts) {
    // ONLY use publishedSlots for public content - never fall back to draft
    const slotsToScan = layout.publishedSlots ?? [];
    for (const slot of slotsToScan) {
      for (const block of slot.blocks) {
        if (block.type === "library" && block.content?.libraryId) {
          activeLibraryIds.add(block.content.libraryId);
        }
      }
    }
  }

  return activeLibraryIds;
}

/**
 * Get all layouts for a site in one query (via denormalized siteId).
 * Returns a Map of pageId → layouts[] for efficient grouping.
 */
export async function getLayoutsBySite(
  ctx: DbCtx,
  siteId: Id<"sites">,
): Promise<Map<string, Doc<"layouts">[]>> {
  const allLayouts = await ctx.db
    .query("layouts")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .collect();

  const byPage = new Map<string, Doc<"layouts">[]>();
  for (const layout of allLayouts) {
    const existing = byPage.get(layout.pageId);
    if (existing) {
      existing.push(layout);
    } else {
      byPage.set(layout.pageId, [layout]);
    }
  }

  return byPage;
}
