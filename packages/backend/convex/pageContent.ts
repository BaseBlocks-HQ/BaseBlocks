import { ConvexError, getConvexSize, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import {
  isOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";
import { canViewerAccessPublishedPageById } from "./sharing";

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

export const pageTabValidator = v.object({ id: v.string(), label: v.string() });
export const pageBlockValidator = v.object({
  id: v.string(),
  type: blockType,
  content: blockContent,
  order: v.number(),
});
export const pageColumnValidator = v.object({
  id: v.string(),
  order: v.number(),
  blocks: v.array(pageBlockValidator),
});
export const pageSectionValidator = v.object({
  id: v.string(),
  tabId: v.optional(v.string()),
  region: sectionRegion,
  order: v.number(),
  columns: v.array(pageColumnValidator),
});
export const pageContentValidator = v.object({
  tabs: v.array(pageTabValidator),
  sections: v.array(pageSectionValidator),
});

// Leave headroom for page/site IDs, timestamps, and Convex's document fields.
const MAX_PAGE_CONTENT_BYTES = 900_000;

const emptyContent = { tabs: [], sections: [] };

function normalizeContent(content: typeof pageContentValidator.type) {
  const ids = new Set<string>();
  const claim = (id: string) => {
    if (!id || ids.has(id))
      throw new ConvexError("Page content IDs must be unique");
    ids.add(id);
  };
  for (const tab of content.tabs) claim(tab.id);
  const tabIds = new Set(content.tabs.map((tab) => tab.id));
  content.sections.forEach((section, sectionOrder) => {
    claim(section.id);
    if (section.tabId && !tabIds.has(section.tabId)) {
      throw new ConvexError("Section references an unknown tab");
    }
    section.order = sectionOrder;
    section.columns.forEach((column, columnOrder) => {
      claim(column.id);
      column.order = columnOrder;
      column.blocks.forEach((block, blockOrder) => {
        claim(block.id);
        block.order = blockOrder;
      });
    });
  });
  if (getConvexSize(content) > MAX_PAGE_CONTENT_BYTES) {
    throw new ConvexError("This page is too large. Split it into child pages.");
  }
  return content;
}

async function getContent(ctx: Pick<QueryCtx, "db">, pageId: Id<"pages">) {
  const document = await ctx.db
    .query("pageContents")
    .withIndex("by_page", (q) => q.eq("pageId", pageId))
    .unique();
  return document
    ? { tabs: document.tabs, sections: document.sections }
    : emptyContent;
}

export const get = query({
  args: { pageId: v.id("pages") },
  returns: pageContentValidator,
  handler: async (ctx, { pageId }) => {
    const page = await ctx.db.get("pages", pageId);
    if (!page) return emptyContent;
    const site = await ctx.db.get("sites", page.siteId);
    if (!site || !(await isOrganizationMember(ctx, site.organizationId)))
      return emptyContent;
    return getContent(ctx, pageId);
  },
});

export const getPublished = query({
  args: {
    pageId: v.id("pages"),
    sessionTokens: v.optional(v.array(v.string())),
  },
  returns: pageContentValidator,
  handler: async (ctx, { pageId, sessionTokens }) =>
    (await canViewerAccessPublishedPageById(ctx, pageId, sessionTokens))
      ? getContent(ctx, pageId)
      : emptyContent,
});

export const save = mutation({
  args: { pageId: v.id("pages"), content: pageContentValidator },
  returns: v.null(),
  handler: async (ctx, { pageId, content }) => {
    const page = await ctx.db.get("pages", pageId);
    if (!page) throw new ConvexError("Page not found");
    const site = await ctx.db.get("sites", page.siteId);
    if (!site) throw new ConvexError("Site not found");
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "content",
      action: "edit",
    });
    const normalized = normalizeContent(structuredClone(content));
    const existing = await ctx.db
      .query("pageContents")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .unique();
    const updatedAt = Date.now();
    if (existing) {
      await ctx.db.patch("pageContents", existing._id, {
        ...normalized,
        updatedAt,
      });
    } else {
      await ctx.db.insert("pageContents", {
        siteId: page.siteId,
        pageId,
        ...normalized,
        updatedAt,
      });
    }
    await ctx.db.patch("pages", pageId, { updatedAt });
    return null;
  },
});
