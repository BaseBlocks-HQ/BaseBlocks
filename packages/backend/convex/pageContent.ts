import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { requireOrganizationPermission, isOrganizationMember } from "./permissions";
import { indexPageContent } from "./search";
import { canViewerAccessPublishedPageById } from "./sharing";
import { resolvePageContext } from "./sites";
import { createDefaultPageStructure } from "./pageStructure";

export const blockType = v.union(
  v.literal("heading"),
  v.literal("paragraph"),
  v.literal("image"),
  v.literal("file"),
  v.literal("library"),
  v.literal("search"),
  v.literal("divider"),
  v.literal("spacer"),
  v.literal("callout"),
  v.literal("code"),
  v.literal("quicklinks"),
  v.literal("richtext"),
  v.literal("page"),
  v.literal("directory"),
  v.literal("flowchart"),
  v.literal("decision-tree"),
);

export const blockContent = v.any();
export const sectionRegion = v.union(v.literal("main"), v.literal("aside"));
export const sectionPreset = v.union(
  v.literal("single"),
  v.literal("columns"),
  v.literal("aside"),
);

const sectionDocument = v.object({
  _id: v.id("sections"),
  _creationTime: v.number(),
  siteId: v.id("sites"),
  pageId: v.id("pages"),
  tabId: v.optional(v.string()),
  region: sectionRegion,
  order: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const columnDocument = v.object({
  _id: v.id("columns"),
  _creationTime: v.number(),
  siteId: v.id("sites"),
  pageId: v.id("pages"),
  sectionId: v.id("sections"),
  order: v.number(),
  createdAt: v.number(),
});

const blockDocument = v.object({
  _id: v.id("blocks"),
  _creationTime: v.number(),
  siteId: v.id("sites"),
  pageId: v.id("pages"),
  sectionId: v.id("sections"),
  columnId: v.id("columns"),
  order: v.number(),
  type: blockType,
  content: blockContent,
  createdAt: v.number(),
  updatedAt: v.number(),
});

const pageStructure = v.object({
  sections: v.array(sectionDocument),
  columns: v.array(columnDocument),
  blocks: v.array(blockDocument),
});

async function loadPageStructure(
  ctx: Pick<QueryCtx, "db">,
  pageId: Id<"pages">,
) {
  const [sections, columns, blocks] = await Promise.all([
    ctx.db
      .query("sections")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .collect(),
    ctx.db
      .query("columns")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .collect(),
    ctx.db
      .query("blocks")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .collect(),
  ]);

  sections.sort((a, b) => a.order - b.order);
  columns.sort((a, b) => a.order - b.order);
  blocks.sort((a, b) => a.order - b.order);
  return { sections, columns, blocks };
}

export const list = query({
  args: { pageId: v.id("pages") },
  returns: pageStructure,
  handler: async (ctx, { pageId }) => {
    const page = await ctx.db.get(pageId);
    if (!page) return { sections: [], columns: [], blocks: [] };
    const site = await ctx.db.get(page.siteId);
    if (!site || !(await isOrganizationMember(ctx, site.organizationId))) {
      return { sections: [], columns: [], blocks: [] };
    }
    return loadPageStructure(ctx, pageId);
  },
});

export const listPublished = query({
  args: {
    pageId: v.id("pages"),
    sessionTokens: v.optional(v.array(v.string())),
  },
  returns: pageStructure,
  handler: async (ctx, { pageId, sessionTokens }) => {
    if (!(await canViewerAccessPublishedPageById(ctx, pageId, sessionTokens))) {
      return { sections: [], columns: [], blocks: [] };
    }
    return loadPageStructure(ctx, pageId);
  },
});

export const createSection = mutation({
  args: {
    pageId: v.id("pages"),
    preset: sectionPreset,
    tabId: v.optional(v.string()),
  },
  returns: v.object({
    sectionId: v.id("sections"),
    firstColumnId: v.optional(v.id("columns")),
  }),
  handler: async (ctx, { pageId, preset, tabId }) => {
    const pageInfo = await resolvePageContext(ctx, pageId);
    if (!pageInfo) throw new Error("Page not found");
    await requireOrganizationPermission(ctx, pageInfo.organizationId, { resource: "content", action: "edit" });

    const existing = await ctx.db
      .query("sections")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .collect();
    const region = preset === "aside" ? ("aside" as const) : ("main" as const);
    const sameRegion = existing.filter(
      (section) => section.tabId === tabId && section.region === region,
    );
    const now = Date.now();
    const sectionId = await ctx.db.insert("sections", {
      siteId: pageInfo.siteId,
      pageId,
      tabId,
      region,
      order:
        sameRegion.reduce((max, section) => Math.max(max, section.order), -1) +
        1,
      createdAt: now,
      updatedAt: now,
    });
    const columnCount = preset === "columns" ? 2 : 1;
    const columnIds = await Promise.all(
      Array.from({ length: columnCount }, (_, order) =>
        ctx.db.insert("columns", {
          siteId: pageInfo.siteId,
          pageId,
          sectionId,
          order,
          createdAt: now,
        }),
      ),
    );
    await ctx.db.patch(pageId, { updatedAt: now });
    return { sectionId, firstColumnId: columnIds[0] };
  },
});

export const removeSection = mutation({
  args: { sectionId: v.id("sections") },
  returns: v.null(),
  handler: async (ctx, { sectionId }) => {
    const section = await ctx.db.get(sectionId);
    if (!section) return null;
    const pageInfo = await resolvePageContext(ctx, section.pageId);
    if (!pageInfo) throw new Error("Page not found");
    await requireOrganizationPermission(ctx, pageInfo.organizationId, { resource: "content", action: "edit" });

    const [columns, blocks] = await Promise.all([
      ctx.db
        .query("columns")
        .withIndex("by_section", (q) => q.eq("sectionId", sectionId))
        .collect(),
      ctx.db
        .query("blocks")
        .withIndex("by_section", (q) => q.eq("sectionId", sectionId))
        .collect(),
    ]);
    await Promise.all([
      ...blocks.map((block) => ctx.db.delete(block._id)),
      ...columns.map((column) => ctx.db.delete(column._id)),
      ctx.db.delete(sectionId),
    ]);
    await ctx.db.patch(section.pageId, { updatedAt: Date.now() });
    await indexPageContent(ctx, section.pageId);
    return null;
  },
});

export const reorderSections = mutation({
  args: {
    pageId: v.id("pages"),
    sectionIds: v.array(v.id("sections")),
  },
  returns: v.null(),
  handler: async (ctx, { pageId, sectionIds }) => {
    const pageInfo = await resolvePageContext(ctx, pageId);
    if (!pageInfo) throw new Error("Page not found");
    await requireOrganizationPermission(ctx, pageInfo.organizationId, { resource: "content", action: "edit" });
    const sections = await Promise.all(sectionIds.map((id) => ctx.db.get(id)));
    if (sections.some((section) => !section || section.pageId !== pageId)) {
      throw new Error("Invalid section order");
    }
    await Promise.all(
      sectionIds.map((id, order) =>
        ctx.db.patch(id, { order, updatedAt: Date.now() }),
      ),
    );
    await ctx.db.patch(pageId, { updatedAt: Date.now() });
    return null;
  },
});

export const addBlock = mutation({
  args: {
    columnId: v.id("columns"),
    type: blockType,
    content: blockContent,
    index: v.optional(v.number()),
  },
  returns: v.id("blocks"),
  handler: async (ctx, { columnId, type, content, index }) => {
    const column = await ctx.db.get(columnId);
    if (!column) throw new Error("Column not found");
    const pageInfo = await resolvePageContext(ctx, column.pageId);
    if (!pageInfo) throw new Error("Page not found");
    await requireOrganizationPermission(ctx, pageInfo.organizationId, { resource: "content", action: "edit" });

    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_column", (q) => q.eq("columnId", columnId))
      .collect();
    blocks.sort((a, b) => a.order - b.order);
    const order = Math.max(0, Math.min(index ?? blocks.length, blocks.length));
    const now = Date.now();
    await Promise.all(
      blocks
        .slice(order)
        .map((block) =>
          ctx.db.patch(block._id, { order: block.order + 1, updatedAt: now }),
        ),
    );
    const blockId = await ctx.db.insert("blocks", {
      siteId: column.siteId,
      pageId: column.pageId,
      sectionId: column.sectionId,
      columnId,
      order,
      type,
      content,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(column.pageId, { updatedAt: now });
    await indexPageContent(ctx, column.pageId);
    return blockId;
  },
});

export const updateBlock = mutation({
  args: { blockId: v.id("blocks"), content: blockContent },
  returns: v.null(),
  handler: async (ctx, { blockId, content }) => {
    const block = await ctx.db.get(blockId);
    if (!block) throw new Error("Block not found");
    const pageInfo = await resolvePageContext(ctx, block.pageId);
    if (!pageInfo) throw new Error("Page not found");
    await requireOrganizationPermission(ctx, pageInfo.organizationId, { resource: "content", action: "edit" });
    const now = Date.now();
    await ctx.db.patch(blockId, { content, updatedAt: now });
    await ctx.db.patch(block.pageId, { updatedAt: now });
    await indexPageContent(ctx, block.pageId);
    return null;
  },
});

export const removeBlock = mutation({
  args: { blockId: v.id("blocks") },
  returns: v.null(),
  handler: async (ctx, { blockId }) => {
    const block = await ctx.db.get(blockId);
    if (!block) return null;
    const pageInfo = await resolvePageContext(ctx, block.pageId);
    if (!pageInfo) throw new Error("Page not found");
    await requireOrganizationPermission(ctx, pageInfo.organizationId, { resource: "content", action: "edit" });
    await ctx.db.delete(blockId);
    const remaining = await ctx.db
      .query("blocks")
      .withIndex("by_column", (q) => q.eq("columnId", block.columnId))
      .collect();
    await Promise.all(
      remaining
        .sort((a, b) => a.order - b.order)
        .map((candidate, order) => ctx.db.patch(candidate._id, { order })),
    );
    await ctx.db.patch(block.pageId, { updatedAt: Date.now() });
    await indexPageContent(ctx, block.pageId);
    return null;
  },
});

export const moveBlock = mutation({
  args: {
    blockId: v.id("blocks"),
    toColumnId: v.id("columns"),
    toIndex: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { blockId, toColumnId, toIndex }) => {
    const [block, destinationColumn] = await Promise.all([
      ctx.db.get(blockId),
      ctx.db.get(toColumnId),
    ]);
    if (
      !block ||
      !destinationColumn ||
      block.pageId !== destinationColumn.pageId
    ) {
      throw new Error("Invalid block destination");
    }
    const pageInfo = await resolvePageContext(ctx, block.pageId);
    if (!pageInfo) throw new Error("Page not found");
    await requireOrganizationPermission(ctx, pageInfo.organizationId, { resource: "content", action: "edit" });

    const sourceColumnId = block.columnId;
    const [sourceBlocks, destinationBlocks] = await Promise.all([
      ctx.db
        .query("blocks")
        .withIndex("by_column", (q) => q.eq("columnId", sourceColumnId))
        .collect(),
      sourceColumnId === toColumnId
        ? Promise.resolve([])
        : ctx.db
            .query("blocks")
            .withIndex("by_column", (q) => q.eq("columnId", toColumnId))
            .collect(),
    ]);
    const source = sourceBlocks
      .filter((candidate) => candidate._id !== blockId)
      .sort((a, b) => a.order - b.order);
    const destination =
      sourceColumnId === toColumnId
        ? source
        : destinationBlocks.sort((a, b) => a.order - b.order);
    const safeIndex = Math.max(0, Math.min(toIndex, destination.length));
    destination.splice(safeIndex, 0, block);
    const now = Date.now();
    const updates = new Map<string, Promise<unknown>>();
    source.forEach((candidate, order) => {
      updates.set(
        candidate._id,
        ctx.db.patch(candidate._id, { order, updatedAt: now }),
      );
    });
    destination.forEach((candidate, order) => {
      updates.set(
        candidate._id,
        ctx.db.patch(candidate._id, {
          columnId: toColumnId,
          sectionId: destinationColumn.sectionId,
          order,
          updatedAt: now,
        }),
      );
    });
    await Promise.all(updates.values());
    await ctx.db.patch(block.pageId, { updatedAt: now });
    await indexPageContent(ctx, block.pageId);
    return null;
  },
});

export const addPageBlock = mutation({
  args: {
    columnId: v.id("columns"),
    title: v.string(),
    slug: v.string(),
  },
  returns: v.id("pages"),
  handler: async (ctx, { columnId, title, slug }) => {
    const column = await ctx.db.get(columnId);
    if (!column) throw new Error("Column not found");
    const page = await ctx.db.get(column.pageId);
    if (!page) throw new Error("Page not found");
    const pageInfo = await resolvePageContext(ctx, page._id);
    if (!pageInfo) throw new Error("Page not found");
    const { auth } = await requireOrganizationPermission(ctx, pageInfo.organizationId, { resource: "content", action: "edit" });
    const now = Date.now();
    const siblingPages = await ctx.db
      .query("pages")
      .withIndex("by_parent", (q) =>
        q.eq("siteId", page.siteId).eq("parentId", page._id),
      )
      .collect();
    const childPageId = await ctx.db.insert("pages", {
      siteId: page.siteId,
      parentId: page._id,
      title,
      slug: slug.toLowerCase(),
      order:
        siblingPages.reduce((max, child) => Math.max(max, child.order), -1) + 1,
      showInNavigation: false,
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });
    await createDefaultPageStructure(ctx, {
      siteId: page.siteId,
      pageId: childPageId,
      now,
    });
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_column", (q) => q.eq("columnId", columnId))
      .collect();
    await ctx.db.insert("blocks", {
      siteId: page.siteId,
      pageId: page._id,
      sectionId: column.sectionId,
      columnId,
      order: blocks.length,
      type: "page",
      content: { pageId: childPageId },
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(page._id, { updatedAt: now });
    return childPageId;
  },
});
