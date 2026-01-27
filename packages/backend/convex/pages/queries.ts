import { v } from "convex/values";
import { query } from "../_generated/server";

// List pages for a site
export const list = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    return await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
  },
});

// Get page by ID
export const get = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    return await ctx.db.get(pageId);
  },
});

// Get page by slug
export const getBySlug = query({
  args: {
    siteId: v.id("sites"),
    slug: v.string(),
  },
  handler: async (ctx, { siteId, slug }) => {
    return await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) => q.eq("siteId", siteId).eq("slug", slug))
      .first();
  },
});

// Get page with blocks
export const getWithBlocks = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    const page = await ctx.db.get(pageId);
    if (!page) return null;

    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .collect();

    // Sort by order
    blocks.sort((a, b) => a.order - b.order);

    return { page, blocks };
  },
});

// Get child pages
export const getChildren = query({
  args: {
    siteId: v.id("sites"),
    parentId: v.optional(v.id("pages")),
  },
  handler: async (ctx, { siteId, parentId }) => {
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_parent", (q) =>
        q.eq("siteId", siteId).eq("parentId", parentId)
      )
      .collect();

    // Sort by order
    pages.sort((a, b) => a.order - b.order);

    return pages;
  },
});

// Build page tree (for navigation)
export const getTree = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const allPages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    // Build tree structure
    type PageWithChildren = (typeof allPages)[0] & {
      children: PageWithChildren[];
    };

    const pageMap = new Map<string, PageWithChildren>();
    const rootPages: PageWithChildren[] = [];

    // First pass: create map with empty children
    for (const page of allPages) {
      pageMap.set(page._id, { ...page, children: [] });
    }

    // Second pass: build tree
    for (const page of allPages) {
      const pageWithChildren = pageMap.get(page._id)!;
      if (page.parentId) {
        const parent = pageMap.get(page.parentId);
        if (parent) {
          parent.children.push(pageWithChildren);
        }
      } else {
        rootPages.push(pageWithChildren);
      }
    }

    // Sort children by order
    const sortChildren = (pages: PageWithChildren[]) => {
      pages.sort((a, b) => a.order - b.order);
      for (const page of pages) {
        sortChildren(page.children);
      }
    };

    sortChildren(rootPages);

    return rootPages;
  },
});
