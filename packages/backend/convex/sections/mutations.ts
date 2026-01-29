import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthContext } from "../auth";

const sectionTypes = v.union(
  v.literal("single"),
  v.literal("rows"),
  v.literal("columns"),
  v.literal("grid")
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
  v.literal("spacer"),
  v.literal("callout"),
  v.literal("code"),
  v.literal("table"),
  v.literal("quicklinks")
);

const slotSchema = v.object({
  id: v.string(),
  position: v.number(),
  blocks: v.array(
    v.object({
      id: v.string(),
      type: blockTypes,
      content: v.any(),
    })
  ),
});

// Settings schema - layout configuration only
const settingsSchema = v.object({
  rowCount: v.optional(v.number()),
  columnCount: v.optional(v.number()),
  gridColumns: v.optional(v.number()),
  gridRows: v.optional(v.number()),
});

// Create a new section
export const create = mutation({
  args: {
    pageId: v.id("pages"),
    type: sectionTypes,
    slots: v.array(slotSchema),
    settings: settingsSchema,
    order: v.optional(v.number()),
  },
  handler: async (ctx, { pageId, type, slots, settings, order }) => {
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
    let sectionOrder = order;
    if (sectionOrder === undefined) {
      const existingSections = await ctx.db
        .query("sections")
        .withIndex("by_page", (q) => q.eq("pageId", pageId))
        .collect();
      sectionOrder =
        existingSections.reduce((max, s) => Math.max(max, s.order), -1) + 1;
    }

    const now = Date.now();
    const sectionId = await ctx.db.insert("sections", {
      pageId,
      type,
      slots,
      settings,
      order: sectionOrder,
      createdAt: now,
      updatedAt: now,
    });

    // Update page updatedAt
    await ctx.db.patch(pageId, { updatedAt: now });

    return sectionId;
  },
});

// Update section settings
export const updateSettings = mutation({
  args: {
    sectionId: v.id("sections"),
    settings: settingsSchema,
  },
  handler: async (ctx, { sectionId, settings }) => {
    const auth = await getAuthContext(ctx);

    const section = await ctx.db.get(sectionId);
    if (!section) throw new Error("Section not found");

    const page = await ctx.db.get(section.pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();
    await ctx.db.patch(sectionId, {
      settings: { ...section.settings, ...settings },
      updatedAt: now,
    });
    await ctx.db.patch(section.pageId, { updatedAt: now });

    return sectionId;
  },
});

// Update section slots (full replacement for atomic updates)
export const updateSlots = mutation({
  args: {
    sectionId: v.id("sections"),
    slots: v.array(slotSchema),
  },
  handler: async (ctx, { sectionId, slots }) => {
    const auth = await getAuthContext(ctx);

    const section = await ctx.db.get(sectionId);
    if (!section) throw new Error("Section not found");

    const page = await ctx.db.get(section.pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();
    await ctx.db.patch(sectionId, {
      slots,
      updatedAt: now,
    });
    await ctx.db.patch(section.pageId, { updatedAt: now });

    return sectionId;
  },
});

// Add a block to a slot
export const addBlockToSlot = mutation({
  args: {
    sectionId: v.id("sections"),
    slotId: v.string(),
    block: v.object({
      id: v.string(),
      type: blockTypes,
      content: v.any(),
    }),
    index: v.optional(v.number()),
  },
  handler: async (ctx, { sectionId, slotId, block, index }) => {
    const auth = await getAuthContext(ctx);

    const section = await ctx.db.get(sectionId);
    if (!section) throw new Error("Section not found");

    const page = await ctx.db.get(section.pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    // Find slot and add block
    const updatedSlots = section.slots.map((slot) => {
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
    await ctx.db.patch(sectionId, {
      slots: updatedSlots,
      updatedAt: now,
    });
    await ctx.db.patch(section.pageId, { updatedAt: now });

    return sectionId;
  },
});

// Update a block in a slot
export const updateBlockInSlot = mutation({
  args: {
    sectionId: v.id("sections"),
    slotId: v.string(),
    blockId: v.string(),
    content: v.any(),
  },
  handler: async (ctx, { sectionId, slotId, blockId, content }) => {
    const auth = await getAuthContext(ctx);

    const section = await ctx.db.get(sectionId);
    if (!section) throw new Error("Section not found");

    const page = await ctx.db.get(section.pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    // Find slot and update block
    const updatedSlots = section.slots.map((slot) => {
      if (slot.id !== slotId) return slot;

      const updatedBlocks = slot.blocks.map((b) =>
        b.id === blockId ? { ...b, content } : b
      );
      return { ...slot, blocks: updatedBlocks };
    });

    const now = Date.now();
    await ctx.db.patch(sectionId, {
      slots: updatedSlots,
      updatedAt: now,
    });
    await ctx.db.patch(section.pageId, { updatedAt: now });

    return sectionId;
  },
});

// Remove a block from a slot
export const removeBlockFromSlot = mutation({
  args: {
    sectionId: v.id("sections"),
    slotId: v.string(),
    blockId: v.string(),
  },
  handler: async (ctx, { sectionId, slotId, blockId }) => {
    const auth = await getAuthContext(ctx);

    const section = await ctx.db.get(sectionId);
    if (!section) throw new Error("Section not found");

    const page = await ctx.db.get(section.pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    // Find slot and remove block
    const updatedSlots = section.slots.map((slot) => {
      if (slot.id !== slotId) return slot;

      return {
        ...slot,
        blocks: slot.blocks.filter((b) => b.id !== blockId),
      };
    });

    const now = Date.now();
    await ctx.db.patch(sectionId, {
      slots: updatedSlots,
      updatedAt: now,
    });
    await ctx.db.patch(section.pageId, { updatedAt: now });

    return sectionId;
  },
});

// Move block within or between slots
export const moveBlock = mutation({
  args: {
    sectionId: v.id("sections"),
    fromSlotId: v.string(),
    toSlotId: v.string(),
    blockId: v.string(),
    toIndex: v.number(),
  },
  handler: async (ctx, { sectionId, fromSlotId, toSlotId, blockId, toIndex }) => {
    const auth = await getAuthContext(ctx);

    const section = await ctx.db.get(sectionId);
    if (!section) throw new Error("Section not found");

    const page = await ctx.db.get(section.pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    // Find the block - use the same type as in slots
    type SlotBlock = (typeof section.slots)[0]["blocks"][0];
    let blockToMove: SlotBlock | undefined;
    for (const slot of section.slots) {
      if (slot.id === fromSlotId) {
        blockToMove = slot.blocks.find((b) => b.id === blockId);
        break;
      }
    }

    if (!blockToMove) throw new Error("Block not found");

    // Handle same slot reorder
    if (fromSlotId === toSlotId) {
      const updatedSlots = section.slots.map((slot) => {
        if (slot.id !== fromSlotId) return slot;
        const filteredBlocks = slot.blocks.filter((b) => b.id !== blockId);
        filteredBlocks.splice(toIndex, 0, blockToMove!);
        return { ...slot, blocks: filteredBlocks };
      });

      const now = Date.now();
      await ctx.db.patch(sectionId, {
        slots: updatedSlots,
        updatedAt: now,
      });
      await ctx.db.patch(section.pageId, { updatedAt: now });
      return sectionId;
    }

    // Move between different slots
    const updatedSlots = section.slots.map((slot) => {
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
    await ctx.db.patch(sectionId, {
      slots: updatedSlots,
      updatedAt: now,
    });
    await ctx.db.patch(section.pageId, { updatedAt: now });

    return sectionId;
  },
});

// Reorder sections on page
export const reorder = mutation({
  args: {
    pageId: v.id("pages"),
    sectionIds: v.array(v.id("sections")),
  },
  handler: async (ctx, { pageId, sectionIds }) => {
    const auth = await getAuthContext(ctx);

    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    // Update order for each section
    for (let i = 0; i < sectionIds.length; i++) {
      const sectionId = sectionIds[i];
      if (sectionId) {
        await ctx.db.patch(sectionId, { order: i });
      }
    }

    await ctx.db.patch(pageId, { updatedAt: Date.now() });
  },
});

// Delete section
export const remove = mutation({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, { sectionId }) => {
    const auth = await getAuthContext(ctx);

    const section = await ctx.db.get(sectionId);
    if (!section) throw new Error("Section not found");

    const page = await ctx.db.get(section.pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(sectionId);
    await ctx.db.patch(section.pageId, { updatedAt: Date.now() });
  },
});
