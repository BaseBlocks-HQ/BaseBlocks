import { v } from "convex/values";
import { query } from "../_generated/server";
import { checkIsMember } from "../auth";

// Get all layouts for a page (draft version - for editor, authenticated)
export const list = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    const page = await ctx.db.get(pageId);
    if (!page) return [];

    const site = await ctx.db.get(page.siteId);
    if (!site) return [];

    if (!(await checkIsMember(ctx, site.teamId))) return [];

    const layouts = await ctx.db
      .query("layouts")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .collect();

    // Sort by order
    layouts.sort((a, b) => a.order - b.order);

    return layouts;
  },
});

// Get all layouts for a page (published version - for public site)
export const listPublished = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    const layouts = await ctx.db
      .query("layouts")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .collect();

    // Filter to only deployed layouts and use published fields
    const deployedLayouts = layouts.filter((l) => l.isDeployed);

    // Sort by published order (fall back to draft order for backwards compat)
    deployedLayouts.sort(
      (a, b) => (a.publishedOrder ?? a.order) - (b.publishedOrder ?? b.order),
    );

    // Return with published fields substituted
    return deployedLayouts.map((layout) => ({
      ...layout,
      type: layout.publishedType ?? layout.type,
      order: layout.publishedOrder ?? layout.order,
      settings: layout.publishedSettings ?? layout.settings,
      tabId: layout.publishedTabId ?? layout.tabId,
      slots: layout.publishedSlots ?? [],
    }));
  },
});

// Get single layout (authenticated)
export const get = query({
  args: { layoutId: v.id("layouts") },
  handler: async (ctx, { layoutId }) => {
    const layout = await ctx.db.get(layoutId);
    if (!layout) return null;

    const page = await ctx.db.get(layout.pageId);
    if (!page) return null;

    const site = await ctx.db.get(page.siteId);
    if (!site) return null;

    if (!(await checkIsMember(ctx, site.teamId))) return null;
    return layout;
  },
});

// Get library IDs that are actively used in blocks on published pages
// This is used to filter search results to only include documents from active libraries
export const getActiveLibraryIds = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    // Get all pages for this site
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    const libraryIds = new Set<string>();

    // Scan all layouts for library blocks
    for (const page of pages) {
      const layouts = await ctx.db
        .query("layouts")
        .withIndex("by_page", (q) => q.eq("pageId", page._id))
        .collect();

      for (const layout of layouts) {
        // Use publishedSlots for public library scanning
        const slotsToScan = layout.publishedSlots ?? [];
        for (const slot of slotsToScan) {
          for (const block of slot.blocks) {
            if (block.type === "library" && block.content?.libraryId) {
              libraryIds.add(block.content.libraryId);
            }
          }
        }
      }
    }

    return Array.from(libraryIds);
  },
});
