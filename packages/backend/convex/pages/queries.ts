import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
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
        q.eq("siteId", siteId).eq("parentId", parentId),
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

// Get page by nested path (e.g., ["docs", "api", "endpoints"])
export const getByPath = query({
  args: {
    siteId: v.id("sites"),
    path: v.array(v.string()),
  },
  handler: async (ctx, { siteId, path }) => {
    // Empty path defaults to "home"
    if (path.length === 0) {
      return await ctx.db
        .query("pages")
        .withIndex("by_slug", (q) => q.eq("siteId", siteId).eq("slug", "home"))
        .first();
    }

    // Walk the path from root to leaf
    let parentId: Id<"pages"> | undefined = undefined;

    for (let i = 0; i < path.length; i++) {
      const slug = path[i]!;
      const isLast = i === path.length - 1;

      // Find page with this slug under current parent
      const page = await ctx.db
        .query("pages")
        .withIndex("by_parent", (q) =>
          q.eq("siteId", siteId).eq("parentId", parentId),
        )
        .filter((q) => q.eq(q.field("slug"), slug))
        .first();

      if (!page) {
        // Fallback: try single-slug lookup for backwards compatibility
        if (path.length === 1) {
          return await ctx.db
            .query("pages")
            .withIndex("by_slug", (q) =>
              q.eq("siteId", siteId).eq("slug", path[0]!),
            )
            .first();
        }
        return null;
      }

      if (isLast) {
        return page;
      }

      parentId = page._id;
    }

    return null;
  },
});

// Get ancestors of a page (for breadcrumbs)
export const getAncestors = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    const ancestors: Array<{
      _id: string;
      title: string;
      slug: string;
    }> = [];

    let currentPage = await ctx.db.get(pageId);

    // Walk up the parent chain
    while (currentPage?.parentId) {
      const parent = await ctx.db.get(currentPage.parentId);
      if (!parent) break;

      ancestors.unshift({
        _id: parent._id,
        title: parent.title,
        slug: parent.slug,
      });

      currentPage = parent;
    }

    return ancestors;
  },
});

// Get full URL path for a page (e.g., "docs/api/endpoints")
export const getFullPath = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    const slugs: string[] = [];
    let currentPage = await ctx.db.get(pageId);

    // Walk up to root, collecting slugs
    while (currentPage) {
      slugs.unshift(currentPage.slug);
      if (!currentPage.parentId) break;
      currentPage = await ctx.db.get(currentPage.parentId);
    }

    return slugs.join("/");
  },
});
