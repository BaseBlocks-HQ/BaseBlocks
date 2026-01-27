import { v } from "convex/values";
import { query } from "../_generated/server";

// Get blocks for a page
export const list = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .collect();

    // Sort by order
    blocks.sort((a, b) => a.order - b.order);

    return blocks;
  },
});

// Get single block
export const get = query({
  args: { blockId: v.id("blocks") },
  handler: async (ctx, { blockId }) => {
    return await ctx.db.get(blockId);
  },
});
