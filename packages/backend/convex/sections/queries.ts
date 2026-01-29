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
