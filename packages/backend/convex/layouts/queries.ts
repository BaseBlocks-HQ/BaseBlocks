import { v } from "convex/values";
import { query } from "../_generated/server";

// Get all layouts for a page
export const list = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    const layouts = await ctx.db
      .query("layouts")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .collect();

    // Sort by order
    layouts.sort((a, b) => a.order - b.order);

    return layouts;
  },
});

// Get single layout
export const get = query({
  args: { layoutId: v.id("layouts") },
  handler: async (ctx, { layoutId }) => {
    return await ctx.db.get(layoutId);
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
        for (const slot of layout.slots) {
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
