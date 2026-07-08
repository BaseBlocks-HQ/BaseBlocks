import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { indexPageContent } from "./lib/indexPageContent";

type LegacySlot = {
  id?: string;
  position?: number;
  blocks?: unknown[];
};

type LegacyLayout = {
  _id: string;
  siteId: Id<"sites">;
  pageId: Id<"pages">;
  tabId?: string;
  type: "single" | "rows" | "columns" | "grid" | "spacer" | "vertical";
  slots?: LegacySlot[];
  settings?: {
    rowCount?: number;
    columnCount?: number;
    gridColumns?: number;
    gridRows?: number;
    spacerHeight?: "small" | "medium" | "large" | "xlarge";
  };
  order?: number;
};

function orderedSlots(layout: LegacyLayout) {
  return [...(layout.slots ?? [])].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );
}

function slotBlocks(slot: LegacySlot | undefined) {
  return Array.isArray(slot?.blocks) ? slot.blocks : [];
}

function layoutToPageBlock(layout: LegacyLayout) {
  const slots = orderedSlots(layout);

  if (layout.type === "single") {
    return {
      id: layout._id,
      type: "single",
      blocks: slotBlocks(slots[0]),
    };
  }

  if (layout.type === "rows") {
    return {
      id: layout._id,
      type: "rows",
      rows: slots.map((slot, index) => ({
        id: slot.id ?? `${layout._id}-row-${index}`,
        blocks: slotBlocks(slot),
      })),
    };
  }

  if (layout.type === "columns") {
    return {
      id: layout._id,
      type: "columns",
      columns: slots.map((slot, index) => ({
        id: slot.id ?? `${layout._id}-column-${index}`,
        blocks: slotBlocks(slot),
      })),
    };
  }

  if (layout.type === "grid") {
    const columns = layout.settings?.gridColumns ?? 2;
    return {
      id: layout._id,
      type: "grid",
      columns,
      cells: slots.map((slot, index) => ({
        id: slot.id ?? `${layout._id}-cell-${index}`,
        blocks: slotBlocks(slot),
      })),
    };
  }

  if (layout.type === "vertical") {
    return {
      id: layout._id,
      type: "sidebar",
      side: "right",
      main: {
        id: slots[0]?.id ?? `${layout._id}-main`,
        blocks: slotBlocks(slots[0]),
      },
      aside: {
        id: slots[1]?.id ?? `${layout._id}-aside`,
        blocks: slotBlocks(slots[1]),
      },
    };
  }

  return {
    id: layout._id,
    type: "spacer",
    size: layout.settings?.spacerHeight ?? "medium",
  };
}

function buildBlocksForPage(
  layouts: LegacyLayout[],
  pageTabs?: Array<{ id: string; label: string }>,
) {
  const orderedLayouts = [...layouts].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );

  if (!pageTabs || pageTabs.length === 0) {
    return orderedLayouts.map(layoutToPageBlock);
  }

  const tabBlocks = pageTabs.map((tab) => ({
    id: tab.id,
    label: tab.label,
    blocks: orderedLayouts
      .filter((layout) => layout.tabId === tab.id)
      .map(layoutToPageBlock),
  }));

  const untabbedBlocks = orderedLayouts
    .filter((layout) => !layout.tabId)
    .map(layoutToPageBlock);

  return [
    ...untabbedBlocks,
    {
      id: `page-tabs-${pageTabs.map((tab) => tab.id).join("-")}`,
      type: "tabs",
      tabs: tabBlocks,
    },
  ];
}

export const recoverLegacyLayoutsIntoPageContent = internalMutation({
  args: {
    siteId: v.optional(v.id("sites")),
    overwrite: v.optional(v.boolean()),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    pagesSeen: v.number(),
    pagesWithLegacyLayouts: v.number(),
    pagesChanged: v.number(),
    legacyLayoutsSeen: v.number(),
  }),
  handler: async (ctx, { siteId, overwrite = false, dryRun = true }) => {
    const pages = siteId
      ? await ctx.db
          .query("pages")
          .withIndex("by_site", (q) => q.eq("siteId", siteId))
          .collect()
      : await ctx.db.query("pages").collect();

    const legacyDb = ctx.db as typeof ctx.db & {
      query(tableName: "layouts"): {
        collect(): Promise<LegacyLayout[]>;
      };
    };

    let legacyLayouts: LegacyLayout[] = [];
    try {
      legacyLayouts = await legacyDb.query("layouts").collect();
    } catch {
      legacyLayouts = [];
    }

    const layoutsByPageId = new Map<string, LegacyLayout[]>();
    for (const layout of legacyLayouts) {
      if (siteId && layout.siteId !== siteId) continue;
      const existing = layoutsByPageId.get(layout.pageId) ?? [];
      existing.push(layout);
      layoutsByPageId.set(layout.pageId, existing);
    }

    let pagesWithLegacyLayouts = 0;
    let pagesChanged = 0;

    for (const page of pages) {
      const pageLayouts = layoutsByPageId.get(page._id);
      if (!pageLayouts || pageLayouts.length === 0) continue;
      pagesWithLegacyLayouts++;

      const hasCurrentContent = (page.content?.blocks ?? []).length > 0;
      if (hasCurrentContent && !overwrite) continue;

      pagesChanged++;
      if (dryRun) continue;

      const pageTabs =
        "pageTabs" in page && Array.isArray(page.pageTabs)
          ? (page.pageTabs as Array<{ id: string; label: string }>)
          : undefined;

      const blocks = buildBlocksForPage(pageLayouts, pageTabs);
      await ctx.db.patch(page._id, {
        content: { blocks },
        updatedAt: Date.now(),
      });
      await indexPageContent(ctx, page._id);
    }

    return {
      pagesSeen: pages.length,
      pagesWithLegacyLayouts,
      pagesChanged,
      legacyLayoutsSeen: legacyLayouts.length,
    };
  },
});
