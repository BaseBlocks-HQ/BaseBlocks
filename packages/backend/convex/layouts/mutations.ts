import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAdmin } from "../auth";
import { markSiteModified } from "../lib/markModified";
import type { Id } from "../_generated/dataModel";

const layoutTypes = v.union(
  v.literal("single"),
  v.literal("rows"),
  v.literal("columns"),
  v.literal("grid"),
  v.literal("spacer"),
  v.literal("vertical"),
);

const blockTypes = v.union(
  v.literal("heading"),
  v.literal("paragraph"),
  v.literal("image"),
  v.literal("file"),
  v.literal("document-list"),
  v.literal("library"),
  v.literal("search"),
  v.literal("embed"),
  v.literal("divider"),
  v.literal("block-spacer"),
  v.literal("callout"),
  v.literal("code"),
  v.literal("table"),
  v.literal("quicklinks"),
  v.literal("form"),
  v.literal("richtext"),
  v.literal("subpage"),
  v.literal("banner"),
  v.literal("directory"),
  v.literal("flowchart"),
  v.literal("decision-tree"),
);

const slotSchema = v.object({
  id: v.string(),
  position: v.number(),
  blocks: v.array(
    v.object({
      id: v.string(),
      type: blockTypes,
      content: v.any(),
    }),
  ),
});

// Settings schema - layout configuration only
const settingsSchema = v.object({
  rowCount: v.optional(v.number()),
  columnCount: v.optional(v.number()),
  gridColumns: v.optional(v.number()),
  gridRows: v.optional(v.number()),
  spacerHeight: v.optional(
    v.union(
      v.literal("small"),
      v.literal("medium"),
      v.literal("large"),
      v.literal("xlarge"),
    ),
  ),
});

// Helper to get teamId from pageId
async function getTeamIdFromPage(
  ctx: { db: any },
  pageId: string,
): Promise<{ teamId: string; siteId: string } | null> {
  const page = await ctx.db.get(pageId);
  if (!page) return null;

  const site = await ctx.db.get(page.siteId);
  if (!site) return null;

  return { teamId: site.teamId, siteId: site._id };
}

// Helper to get teamId from layoutId
async function getTeamIdFromLayout(
  ctx: { db: any },
  layoutId: string,
): Promise<{ teamId: string; pageId: string; siteId: string } | null> {
  const layout = await ctx.db.get(layoutId);
  if (!layout) return null;

  const page = await ctx.db.get(layout.pageId);
  if (!page) return null;

  const site = await ctx.db.get(page.siteId);
  if (!site) return null;

  return { teamId: site.teamId, pageId: layout.pageId, siteId: site._id };
}

// Create a new layout
export const create = mutation({
  args: {
    pageId: v.id("pages"),
    type: layoutTypes,
    slots: v.array(slotSchema),
    settings: settingsSchema,
    order: v.optional(v.number()),
    tabId: v.optional(v.string()),
  },
  handler: async (ctx, { pageId, type, slots, settings, order, tabId }) => {
    const pageInfo = await getTeamIdFromPage(ctx, pageId);
    if (!pageInfo) throw new Error("Page not found");

    // Require admin access for write operations
    await requireAdmin(ctx, pageInfo.teamId as any);

    // Get max order if not specified (scoped to same tab)
    let layoutOrder = order;
    if (layoutOrder === undefined) {
      const existingLayouts = await ctx.db
        .query("layouts")
        .withIndex("by_page", (q: any) => q.eq("pageId", pageId))
        .collect();
      const tabLayouts = existingLayouts.filter(
        (l: any) => l.tabId === tabId
      );
      layoutOrder =
        tabLayouts.reduce(
          (max: number, s: any) => Math.max(max, s.order),
          -1,
        ) + 1;
    }

    const now = Date.now();
    const layoutId = await ctx.db.insert("layouts", {
      pageId,
      tabId,
      type,
      slots,
      settings,
      order: layoutOrder,
      createdAt: now,
      updatedAt: now,
    });

    // Update page updatedAt and mark site modified
    await ctx.db.patch(pageId, { updatedAt: now });
    await markSiteModified(ctx, pageInfo.siteId as Id<"sites">);

    return layoutId;
  },
});

// Update layout settings
export const updateSettings = mutation({
  args: {
    layoutId: v.id("layouts"),
    settings: settingsSchema,
  },
  handler: async (ctx, { layoutId, settings }) => {
    const layout = await ctx.db.get(layoutId);
    if (!layout) throw new Error("Layout not found");

    const layoutInfo = await getTeamIdFromLayout(ctx, layoutId);
    if (!layoutInfo) throw new Error("Layout not found");

    // Require admin access for write operations
    await requireAdmin(ctx, layoutInfo.teamId as any);

    const now = Date.now();
    await ctx.db.patch(layoutId, {
      settings: { ...layout.settings, ...settings },
      updatedAt: now,
    });
    await ctx.db.patch(layout.pageId, { updatedAt: now });
    await markSiteModified(ctx, layoutInfo.siteId as Id<"sites">);

    return layoutId;
  },
});

// Update layout slots (full replacement for atomic updates)
export const updateSlots = mutation({
  args: {
    layoutId: v.id("layouts"),
    slots: v.array(slotSchema),
  },
  handler: async (ctx, { layoutId, slots }) => {
    const layout = await ctx.db.get(layoutId);
    if (!layout) throw new Error("Layout not found");

    const layoutInfo = await getTeamIdFromLayout(ctx, layoutId);
    if (!layoutInfo) throw new Error("Layout not found");

    // Require admin access for write operations
    await requireAdmin(ctx, layoutInfo.teamId as any);

    const now = Date.now();
    await ctx.db.patch(layoutId, {
      slots,
      updatedAt: now,
    });
    await ctx.db.patch(layout.pageId, { updatedAt: now });
    await markSiteModified(ctx, layoutInfo.siteId as Id<"sites">);

    return layoutId;
  },
});

// Add a block to a slot
export const addBlockToSlot = mutation({
  args: {
    layoutId: v.id("layouts"),
    slotId: v.string(),
    block: v.object({
      id: v.string(),
      type: blockTypes,
      content: v.any(),
    }),
    index: v.optional(v.number()),
  },
  handler: async (ctx, { layoutId, slotId, block, index }) => {
    const layout = await ctx.db.get(layoutId);
    if (!layout) throw new Error("Layout not found");

    const layoutInfo = await getTeamIdFromLayout(ctx, layoutId);
    if (!layoutInfo) throw new Error("Layout not found");

    // Require admin access for write operations
    await requireAdmin(ctx, layoutInfo.teamId as any);

    // Find slot and add block
    const updatedSlots = layout.slots.map((slot: any) => {
      if (slot.id !== slotId) return slot;

      const newBlocks = [...slot.blocks];
      if (index !== undefined && index >= 0 && index <= newBlocks.length) {
        newBlocks.splice(index, 0, block);
      } else {
        newBlocks.push(block);
      }
      return { ...slot, blocks: newBlocks };
    });

    const now = Date.now();
    await ctx.db.patch(layoutId, {
      slots: updatedSlots,
      updatedAt: now,
    });
    await ctx.db.patch(layout.pageId, { updatedAt: now });
    await markSiteModified(ctx, layoutInfo.siteId as Id<"sites">);

    return layoutId;
  },
});

// Update a block in a slot
export const updateBlockInSlot = mutation({
  args: {
    layoutId: v.id("layouts"),
    slotId: v.string(),
    blockId: v.string(),
    content: v.any(),
  },
  handler: async (ctx, { layoutId, slotId, blockId, content }) => {
    const layout = await ctx.db.get(layoutId);
    if (!layout) throw new Error("Layout not found");

    const layoutInfo = await getTeamIdFromLayout(ctx, layoutId);
    if (!layoutInfo) throw new Error("Layout not found");

    // Require admin access for write operations
    await requireAdmin(ctx, layoutInfo.teamId as any);

    // Find slot and update block
    const updatedSlots = layout.slots.map((slot: any) => {
      if (slot.id !== slotId) return slot;

      const updatedBlocks = slot.blocks.map((b: any) =>
        b.id === blockId ? { ...b, content } : b,
      );
      return { ...slot, blocks: updatedBlocks };
    });

    const now = Date.now();
    await ctx.db.patch(layoutId, {
      slots: updatedSlots,
      updatedAt: now,
    });
    await ctx.db.patch(layout.pageId, { updatedAt: now });
    await markSiteModified(ctx, layoutInfo.siteId as Id<"sites">);

    return layoutId;
  },
});

// Remove a block from a slot
export const removeBlockFromSlot = mutation({
  args: {
    layoutId: v.id("layouts"),
    slotId: v.string(),
    blockId: v.string(),
  },
  handler: async (ctx, { layoutId, slotId, blockId }) => {
    const layout = await ctx.db.get(layoutId);
    if (!layout) throw new Error("Layout not found");

    const layoutInfo = await getTeamIdFromLayout(ctx, layoutId);
    if (!layoutInfo) throw new Error("Layout not found");

    // Require admin access for write operations
    await requireAdmin(ctx, layoutInfo.teamId as any);

    // Find slot and remove block
    const updatedSlots = layout.slots.map((slot: any) => {
      if (slot.id !== slotId) return slot;

      return {
        ...slot,
        blocks: slot.blocks.filter((b: any) => b.id !== blockId),
      };
    });

    const now = Date.now();
    await ctx.db.patch(layoutId, {
      slots: updatedSlots,
      updatedAt: now,
    });
    await ctx.db.patch(layout.pageId, { updatedAt: now });
    await markSiteModified(ctx, layoutInfo.siteId as Id<"sites">);

    return layoutId;
  },
});

// Move block within or between slots
export const moveBlock = mutation({
  args: {
    layoutId: v.id("layouts"),
    fromSlotId: v.string(),
    toSlotId: v.string(),
    blockId: v.string(),
    toIndex: v.number(),
  },
  handler: async (
    ctx,
    { layoutId, fromSlotId, toSlotId, blockId, toIndex },
  ) => {
    const layout = await ctx.db.get(layoutId);
    if (!layout) throw new Error("Layout not found");

    const layoutInfo = await getTeamIdFromLayout(ctx, layoutId);
    if (!layoutInfo) throw new Error("Layout not found");

    // Require admin access for write operations
    await requireAdmin(ctx, layoutInfo.teamId as any);

    // Find the block - use the same type as in slots
    type SlotBlock = (typeof layout.slots)[0]["blocks"][0];
    let blockToMove: SlotBlock | undefined;
    for (const slot of layout.slots) {
      if (slot.id === fromSlotId) {
        blockToMove = slot.blocks.find((b) => b.id === blockId);
        break;
      }
    }

    if (!blockToMove) throw new Error("Block not found");

    // Handle same slot reorder
    if (fromSlotId === toSlotId) {
      const updatedSlots = layout.slots.map((slot) => {
        if (slot.id !== fromSlotId) return slot;
        const filteredBlocks = slot.blocks.filter((b) => b.id !== blockId);
        filteredBlocks.splice(toIndex, 0, blockToMove!);
        return { ...slot, blocks: filteredBlocks };
      });

      const now = Date.now();
      await ctx.db.patch(layoutId, {
        slots: updatedSlots,
        updatedAt: now,
      });
      await ctx.db.patch(layout.pageId, { updatedAt: now });
      await markSiteModified(ctx, layoutInfo.siteId as Id<"sites">);
      return layoutId;
    }

    // Move between different slots
    const updatedSlots = layout.slots.map((slot) => {
      // Remove from source
      if (slot.id === fromSlotId) {
        return {
          ...slot,
          blocks: slot.blocks.filter((b) => b.id !== blockId),
        };
      }
      // Add to destination
      if (slot.id === toSlotId) {
        const newBlocks = [...slot.blocks];
        newBlocks.splice(toIndex, 0, blockToMove!);
        return { ...slot, blocks: newBlocks };
      }
      return slot;
    });

    const now = Date.now();
    await ctx.db.patch(layoutId, {
      slots: updatedSlots,
      updatedAt: now,
    });
    await ctx.db.patch(layout.pageId, { updatedAt: now });
    await markSiteModified(ctx, layoutInfo.siteId as Id<"sites">);

    return layoutId;
  },
});

// Reorder layouts on page
export const reorder = mutation({
  args: {
    pageId: v.id("pages"),
    layoutIds: v.array(v.id("layouts")),
  },
  handler: async (ctx, { pageId, layoutIds }) => {
    const pageInfo = await getTeamIdFromPage(ctx, pageId);
    if (!pageInfo) throw new Error("Page not found");

    // Require admin access for write operations
    await requireAdmin(ctx, pageInfo.teamId as any);

    // Update order for each layout
    for (let i = 0; i < layoutIds.length; i++) {
      const layoutId = layoutIds[i];
      if (layoutId) {
        await ctx.db.patch(layoutId, { order: i });
      }
    }

    await ctx.db.patch(pageId, { updatedAt: Date.now() });
    await markSiteModified(ctx, pageInfo.siteId as Id<"sites">);
  },
});

// Delete layout
export const remove = mutation({
  args: { layoutId: v.id("layouts") },
  handler: async (ctx, { layoutId }) => {
    const layout = await ctx.db.get(layoutId);
    if (!layout) throw new Error("Layout not found");

    const layoutInfo = await getTeamIdFromLayout(ctx, layoutId);
    if (!layoutInfo) throw new Error("Layout not found");

    // Require admin access for write operations
    await requireAdmin(ctx, layoutInfo.teamId as any);

    await ctx.db.delete(layoutId);
    await ctx.db.patch(layout.pageId, { updatedAt: Date.now() });
    await markSiteModified(ctx, layoutInfo.siteId as Id<"sites">);
  },
});

// Atomically create a child page + default layout + subpage block in one mutation
export const addSubpageBlock = mutation({
  args: {
    layoutId: v.id("layouts"),
    slotId: v.string(),
    blockId: v.string(),
    title: v.string(),
    slug: v.string(),
    index: v.optional(v.number()),
  },
  handler: async (ctx, { layoutId, slotId, blockId, title, slug, index }) => {
    const layout = await ctx.db.get(layoutId);
    if (!layout) throw new Error("Layout not found");

    const layoutInfo = await getTeamIdFromLayout(ctx, layoutId);
    if (!layoutInfo) throw new Error("Layout not found");

    const { auth } = await requireAdmin(ctx, layoutInfo.teamId as any);

    const page = await ctx.db.get(layout.pageId);
    if (!page) throw new Error("Page not found");

    // Check slug uniqueness
    const existingSlug = await ctx.db
      .query("pages")
      .withIndex("by_slug", (q: any) =>
        q.eq("siteId", page.siteId).eq("slug", slug.toLowerCase()),
      )
      .first();
    if (existingSlug) {
      throw new Error(
        `A page with the URL "${slug}" already exists. Please choose a different title.`,
      );
    }

    const now = Date.now();

    // 1. Create child page
    const siblings = await ctx.db
      .query("pages")
      .withIndex("by_parent", (q: any) =>
        q.eq("siteId", page.siteId).eq("parentId", layout.pageId),
      )
      .collect();
    const maxOrder = siblings.reduce(
      (max: number, p: any) => Math.max(max, p.order),
      -1,
    );

    const childPageId = await ctx.db.insert("pages", {
      siteId: page.siteId,
      title,
      slug: slug.toLowerCase(),
      parentId: layout.pageId,
      order: maxOrder + 1,
      isPublished: false,
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Create default layout on child page
    await ctx.db.insert("layouts", {
      pageId: childPageId,
      type: "single",
      slots: [{ id: "default-slot", position: 0, blocks: [] }],
      settings: {},
      order: 0,
      createdAt: now,
      updatedAt: now,
    });

    // 3. Add subpage block to the specified slot
    const block = {
      id: blockId,
      type: "subpage" as const,
      content: { pageId: childPageId },
    };

    const updatedSlots = layout.slots.map((s: any) => {
      if (s.id !== slotId) return s;
      const newBlocks = [...s.blocks];
      if (index !== undefined && index >= 0 && index <= newBlocks.length) {
        newBlocks.splice(index, 0, block);
      } else {
        newBlocks.push(block);
      }
      return { ...s, blocks: newBlocks };
    });

    await ctx.db.patch(layoutId, { slots: updatedSlots, updatedAt: now });
    await ctx.db.patch(layout.pageId, { updatedAt: now });
    await markSiteModified(ctx, layoutInfo.siteId as Id<"sites">);

    return { childPageId };
  },
});
