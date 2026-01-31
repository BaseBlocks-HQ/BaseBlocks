import { v } from "convex/values";
import { query } from "../_generated/server";

// Get all sections for a page
export const list = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    const sections = await ctx.db
      .query("sections")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .collect();

    // Sort by order
    sections.sort((a, b) => a.order - b.order);

    return sections;
  },
});

// Get single section
export const get = query({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, { sectionId }) => {
    return await ctx.db.get(sectionId);
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

    // Scan all sections for library blocks
    for (const page of pages) {
      const sections = await ctx.db
        .query("sections")
        .withIndex("by_page", (q) => q.eq("pageId", page._id))
        .collect();

      for (const section of sections) {
        for (const slot of section.slots) {
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
