import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthContext } from "../auth";

const blockTypes = v.union(
  v.literal("heading"),
  v.literal("paragraph"),
  v.literal("image"),
  v.literal("file"),
  v.literal("document-list"),
  v.literal("embed"),
  v.literal("divider"),
  v.literal("callout"),
  v.literal("code"),
  v.literal("table"),
);

// Create a new block
export const create = mutation({
  args: {
    pageId: v.id("pages"),
    type: blockTypes,
    content: v.any(),
    order: v.optional(v.number()),
  },
  handler: async (ctx, { pageId, type, content, order }) => {
    const auth = await getAuthContext(ctx);

    // Verify access to page
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    // Get max order if not specified
    let blockOrder = order;
    if (blockOrder === undefined) {
      const existingBlocks = await ctx.db
        .query("blocks")
        .withIndex("by_page", (q) => q.eq("pageId", pageId))
        .collect();
      blockOrder =
        existingBlocks.reduce((max, b) => Math.max(max, b.order), -1) + 1;
    }

    const now = Date.now();
    const blockId = await ctx.db.insert("blocks", {
      pageId,
      type,
      content,
      order: blockOrder,
      createdAt: now,
      updatedAt: now,
    });

    // Update page updatedAt
    await ctx.db.patch(pageId, { updatedAt: now });

    return blockId;
  },
});

// Update block content
export const update = mutation({
  args: {
    blockId: v.id("blocks"),
    content: v.optional(v.any()),
    type: v.optional(blockTypes),
  },
  handler: async (ctx, { blockId, content, type }) => {
    const auth = await getAuthContext(ctx);

    const block = await ctx.db.get(blockId);
    if (!block) throw new Error("Block not found");

    const page = await ctx.db.get(block.pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();
    const updates: Record<string, unknown> = { updatedAt: now };
    if (content !== undefined) updates.content = content;
    if (type !== undefined) updates.type = type;

    await ctx.db.patch(blockId, updates);
    await ctx.db.patch(block.pageId, { updatedAt: now });

    return blockId;
  },
});

// Reorder blocks
export const reorder = mutation({
  args: {
    pageId: v.id("pages"),
    blockIds: v.array(v.id("blocks")),
  },
  handler: async (ctx, { pageId, blockIds }) => {
    const auth = await getAuthContext(ctx);

    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    // Update order for each block
    for (let i = 0; i < blockIds.length; i++) {
      const blockId = blockIds[i];
      if (blockId) {
        await ctx.db.patch(blockId, { order: i });
      }
    }

    await ctx.db.patch(pageId, { updatedAt: Date.now() });
  },
});

// Delete block
export const remove = mutation({
  args: { blockId: v.id("blocks") },
  handler: async (ctx, { blockId }) => {
    const auth = await getAuthContext(ctx);

    const block = await ctx.db.get(blockId);
    if (!block) throw new Error("Block not found");

    const page = await ctx.db.get(block.pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(blockId);
    await ctx.db.patch(block.pageId, { updatedAt: Date.now() });
  },
});
