// Flattened Convex domain module. Keep this file as the public API for this domain.
import { createLayoutDraft } from "@baseblocks/domain";
import { nanoid } from "nanoid";
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { checkIsMember, requireContentEditor } from "./permissions";
import { indexPageContent } from "./search";
import { canViewerAccessPublishedPageById } from "./sharing";
import { resolveLayoutContext, resolvePageContext } from "./sites";

/** All block types supported in layout slots */
export const blockType = v.union(
  v.literal("heading"),
  v.literal("paragraph"),
  v.literal("image"),
  v.literal("file"),
  v.literal("document-list"),
  v.literal("library"),
  v.literal("search"),
  v.literal("embed"),
  v.literal("divider"),
  v.literal("spacer"),
  v.literal("callout"),
  v.literal("code"),
  v.literal("table"),
  v.literal("quicklinks"),
  v.literal("richtext"),
  v.literal("page"),
  v.literal("directory"),
  v.literal("flowchart"),
  v.literal("decision-tree"),
);

/**
 * Block content validator.
 *
 * Content is polymorphic per block type (heading has {text, level}, image has
 * {url, alt, caption, ...}, etc.). A full discriminated union for all block
 * types would be massive and brittle. Content shape validation happens at the
 * TypeScript/frontend layer via @baseblocks/domain/elements. Uses v.any() here.
 */
export const blockContent = v.any();

/** A single block within a slot */
export const slotBlock = v.object({
  id: v.string(),
  type: blockType,
  content: blockContent,
});

/** A slot within a layout (contains positioned blocks) */
export const layoutSlot = v.object({
  id: v.string(),
  position: v.number(),
  blocks: v.array(slotBlock),
});

/** All layout container types */
export const layoutType = v.union(
  v.literal("single"),
  v.literal("rows"),
  v.literal("columns"),
  v.literal("grid"),
  v.literal("spacer"),
  v.literal("vertical"),
);

/** Layout settings (grid/row/column/spacer configuration) */
export const layoutSettings = v.object({
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
  args: {
    pageId: v.id("pages"),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { pageId, sessionTokens }) => {
    const canAccessPage = await canViewerAccessPublishedPageById(
      ctx,
      pageId,
      sessionTokens,
    );
    if (!canAccessPage) {
      return [];
    }

    const layouts = await ctx.db
      .query("layouts")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .collect();
    layouts.sort((a, b) => a.order - b.order);
    return layouts;
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

function createEditorId(): string {
  return Math.random().toString(36).slice(2, 12);
}

// Create a new layout
export const create = mutation({
  args: {
    pageId: v.id("pages"),
    type: layoutType,
    slots: v.optional(v.array(layoutSlot)),
    settings: v.optional(layoutSettings),
    order: v.optional(v.number()),
    tabId: v.optional(v.string()),
  },
  handler: async (ctx, { pageId, type, slots, settings, order, tabId }) => {
    const pageInfo = await resolvePageContext(ctx, pageId);
    if (!pageInfo) throw new Error("Page not found");

    await requireContentEditor(ctx, pageInfo.teamId);

    // Get max order if not specified (scoped to same tab)
    let layoutOrder = order;
    if (layoutOrder === undefined) {
      const existingLayouts = await ctx.db
        .query("layouts")
        .withIndex("by_page", (q) => q.eq("pageId", pageId))
        .collect();
      const tabLayouts = existingLayouts.filter((l) => l.tabId === tabId);
      layoutOrder =
        tabLayouts.reduce((max, l) => Math.max(max, l.order), -1) + 1;
    }

    const draft = createLayoutDraft({
      createId: createEditorId,
      order: layoutOrder,
      settingsOverrides: settings,
      tabId,
      type,
    });
    const now = Date.now();
    const layoutId = await ctx.db.insert("layouts", {
      siteId: pageInfo.siteId,
      pageId,
      tabId,
      type,
      slots: slots ?? draft.slots,
      settings: draft.settings,
      order: layoutOrder,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(pageId, { updatedAt: now });

    return {
      layoutId,
      firstSlotId: (slots ?? draft.slots)[0]?.id,
    };
  },
});

// Update layout settings
export const updateSettings = mutation({
  args: {
    layoutId: v.id("layouts"),
    settings: layoutSettings,
  },
  handler: async (ctx, { layoutId, settings }) => {
    const layout = await ctx.db.get(layoutId);
    if (!layout) throw new Error("Layout not found");

    const layoutInfo = await resolveLayoutContext(ctx, layoutId);
    if (!layoutInfo) throw new Error("Layout not found");

    await requireContentEditor(ctx, layoutInfo.teamId);

    const now = Date.now();
    await ctx.db.patch(layoutId, {
      settings: { ...layout.settings, ...settings },
      updatedAt: now,
    });
    await ctx.db.patch(layout.pageId, { updatedAt: now });

    return layoutId;
  },
});

// Update layout slots (full replacement for atomic updates)
export const updateSlots = mutation({
  args: {
    layoutId: v.id("layouts"),
    slots: v.array(layoutSlot),
  },
  handler: async (ctx, { layoutId, slots }) => {
    const layout = await ctx.db.get(layoutId);
    if (!layout) throw new Error("Layout not found");

    const layoutInfo = await resolveLayoutContext(ctx, layoutId);
    if (!layoutInfo) throw new Error("Layout not found");

    await requireContentEditor(ctx, layoutInfo.teamId);

    const now = Date.now();
    await ctx.db.patch(layoutId, {
      slots,
      updatedAt: now,
    });
    await ctx.db.patch(layout.pageId, { updatedAt: now });
    await indexPageContent(ctx, layout.pageId);

    return layoutId;
  },
});

// Add a block to a slot
export const addBlockToSlot = mutation({
  args: {
    layoutId: v.id("layouts"),
    slotId: v.string(),
    block: slotBlock,
    index: v.optional(v.number()),
  },
  handler: async (ctx, { layoutId, slotId, block, index }) => {
    const layout = await ctx.db.get(layoutId);
    if (!layout) throw new Error("Layout not found");

    const layoutInfo = await resolveLayoutContext(ctx, layoutId);
    if (!layoutInfo) throw new Error("Layout not found");

    await requireContentEditor(ctx, layoutInfo.teamId);

    const updatedSlots = layout.slots.map((slot) => {
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
    await indexPageContent(ctx, layout.pageId);

    return layoutId;
  },
});

// Update a block in a slot
export const updateBlockInSlot = mutation({
  args: {
    layoutId: v.id("layouts"),
    slotId: v.string(),
    blockId: v.string(),
    content: blockContent,
  },
  handler: async (ctx, { layoutId, slotId, blockId, content }) => {
    const layout = await ctx.db.get(layoutId);
    if (!layout) throw new Error("Layout not found");

    const layoutInfo = await resolveLayoutContext(ctx, layoutId);
    if (!layoutInfo) throw new Error("Layout not found");

    await requireContentEditor(ctx, layoutInfo.teamId);

    const updatedSlots = layout.slots.map((slot) => {
      if (slot.id !== slotId) return slot;

      const updatedBlocks = slot.blocks.map((b) =>
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
    await indexPageContent(ctx, layout.pageId);

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

    const layoutInfo = await resolveLayoutContext(ctx, layoutId);
    if (!layoutInfo) throw new Error("Layout not found");

    await requireContentEditor(ctx, layoutInfo.teamId);

    const updatedSlots = layout.slots.map((slot) => {
      if (slot.id !== slotId) return slot;

      return {
        ...slot,
        blocks: slot.blocks.filter((b) => b.id !== blockId),
      };
    });

    const now = Date.now();
    await ctx.db.patch(layoutId, {
      slots: updatedSlots,
      updatedAt: now,
    });
    await ctx.db.patch(layout.pageId, { updatedAt: now });
    await indexPageContent(ctx, layout.pageId);

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

    const layoutInfo = await resolveLayoutContext(ctx, layoutId);
    if (!layoutInfo) throw new Error("Layout not found");

    await requireContentEditor(ctx, layoutInfo.teamId);

    // Find the block
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
      return layoutId;
    }

    // Move between different slots
    const updatedSlots = layout.slots.map((slot) => {
      if (slot.id === fromSlotId) {
        return {
          ...slot,
          blocks: slot.blocks.filter((b) => b.id !== blockId),
        };
      }
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
    const pageInfo = await resolvePageContext(ctx, pageId);
    if (!pageInfo) throw new Error("Page not found");

    await requireContentEditor(ctx, pageInfo.teamId);

    for (let i = 0; i < layoutIds.length; i++) {
      const layoutId = layoutIds[i];
      if (layoutId) {
        await ctx.db.patch(layoutId, { order: i });
      }
    }

    await ctx.db.patch(pageId, { updatedAt: Date.now() });
  },
});

// Delete layout
export const remove = mutation({
  args: { layoutId: v.id("layouts") },
  handler: async (ctx, { layoutId }) => {
    const layout = await ctx.db.get(layoutId);
    if (!layout) throw new Error("Layout not found");

    const layoutInfo = await resolveLayoutContext(ctx, layoutId);
    if (!layoutInfo) throw new Error("Layout not found");

    await requireContentEditor(ctx, layoutInfo.teamId);

    await ctx.db.delete(layoutId);
    await ctx.db.patch(layout.pageId, { updatedAt: Date.now() });
  },
});

// Atomically create a child page + default layout + page block in one mutation
export const addPageBlock = mutation({
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

    const layoutInfo = await resolveLayoutContext(ctx, layoutId);
    if (!layoutInfo) throw new Error("Layout not found");

    const { auth } = await requireContentEditor(ctx, layoutInfo.teamId);

    const page = await ctx.db.get(layout.pageId);
    if (!page) throw new Error("Page not found");

    // Check slug uniqueness
    const existingSlug = await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) =>
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
      .withIndex("by_parent", (q) =>
        q.eq("siteId", page.siteId).eq("parentId", layout.pageId),
      )
      .collect();
    const maxOrder = siblings.reduce((max, p) => Math.max(max, p.order), -1);

    const childPageId = await ctx.db.insert("pages", {
      siteId: page.siteId,
      title,
      slug: slug.toLowerCase(),
      parentId: layout.pageId,
      order: maxOrder + 1,
      showInNavigation: false,
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Create default layout on child page
    const childPageLayout = createLayoutDraft({
      createId: createEditorId,
      type: "single",
    });
    await ctx.db.insert("layouts", {
      siteId: page.siteId,
      pageId: childPageId,
      type: "single",
      slots: childPageLayout.slots,
      settings: childPageLayout.settings,
      order: 0,
      createdAt: now,
      updatedAt: now,
    });

    // 3. Add page block to the specified slot
    const block = {
      id: blockId,
      type: "page" as const,
      content: { pageId: childPageId },
    };

    const updatedSlots = layout.slots.map((s) => {
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
    await indexPageContent(ctx, childPageId);

    return { childPageId };
  },
});
