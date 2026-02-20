import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { requireMember } from "../auth";

// List pages for a site (authenticated — editor only)
export const list = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return [];

    await requireMember(ctx, site.teamId);

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

// Build published page tree (for public navigation)
// Uses publishedTitle, publishedSlug, publishedOrder, publishedParentId
// Only includes pages that have been deployed
export const getTreePublished = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const allPages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    // Filter to only deployed pages, excluding subpage block content (accessed via side panel)
    const deployedPages = allPages.filter(
      (p) => p.isDeployed && !p.isSubpageContent,
    );

    // Build tree using published fields (fall back to draft for migration compat)
    type PageNode = {
      _id: string;
      siteId: typeof siteId;
      title: string;
      slug: string;
      icon?: string;
      order: number;
      parentId?: string;
      pageTabs?: Array<{ id: string; label: string }>;
      children: PageNode[];
    };

    const pageMap = new Map<string, PageNode>();
    const rootPages: PageNode[] = [];

    // First pass: create map
    for (const page of deployedPages) {
      pageMap.set(page._id, {
        _id: page._id,
        siteId: page.siteId,
        title: page.publishedTitle ?? page.title,
        slug: page.publishedSlug ?? page.slug,
        icon: page.publishedIcon ?? page.icon,
        order: page.publishedOrder ?? page.order,
        parentId: page.publishedParentId ?? page.parentId,
        pageTabs: page.publishedPageTabs ?? page.pageTabs,
        children: [],
      });
    }

    // Second pass: build tree
    for (const node of pageMap.values()) {
      if (node.parentId) {
        const parent = pageMap.get(node.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          // Parent not deployed, treat as root
          rootPages.push(node);
        }
      } else {
        rootPages.push(node);
      }
    }

    // Sort children by order
    const sortChildren = (pages: PageNode[]) => {
      pages.sort((a, b) => a.order - b.order);
      for (const page of pages) {
        sortChildren(page.children);
      }
    };

    sortChildren(rootPages);

    return rootPages;
  },
});

// Get published page by nested path (for public routing)
// Uses publishedSlug and publishedParentId to walk the tree
export const getByPathPublished = query({
  args: {
    siteId: v.id("sites"),
    path: v.array(v.string()),
  },
  handler: async (ctx, { siteId, path }) => {
    // Get all deployed pages for this site
    const allPages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    const deployedPages = allPages.filter((p) => p.isDeployed);

    // Empty path: resolve via site's defaultPageId, then fall back to first root page
    if (path.length === 0) {
      const site = await ctx.db.get(siteId);
      // Prefer draft defaultPageId (user's current setting) over published (stale from last deploy)
      const resolvedDefaultPageId =
        site?.defaultPageId ?? site?.publishedDefaultPageId;

      // Try the configured default page first
      if (resolvedDefaultPageId) {
        const defaultPage = deployedPages.find(
          (p) => p._id === resolvedDefaultPageId,
        );
        if (defaultPage) {
          return {
            ...defaultPage,
            title: defaultPage.publishedTitle ?? defaultPage.title,
            slug: defaultPage.publishedSlug ?? defaultPage.slug,
            icon: defaultPage.publishedIcon ?? defaultPage.icon,
            order: defaultPage.publishedOrder ?? defaultPage.order,
            parentId: defaultPage.publishedParentId ?? defaultPage.parentId,
            pageTabs: defaultPage.publishedPageTabs ?? defaultPage.pageTabs,
          };
        }
      }

      // Fallback: first deployed root page by order
      const rootPages = deployedPages
        .filter((p) => !(p.publishedParentId ?? p.parentId))
        .sort(
          (a, b) =>
            (a.publishedOrder ?? a.order) - (b.publishedOrder ?? b.order),
        );

      const firstPage = rootPages[0];
      if (firstPage) {
        return {
          ...firstPage,
          title: firstPage.publishedTitle ?? firstPage.title,
          slug: firstPage.publishedSlug ?? firstPage.slug,
          icon: firstPage.publishedIcon ?? firstPage.icon,
          order: firstPage.publishedOrder ?? firstPage.order,
          parentId: firstPage.publishedParentId ?? firstPage.parentId,
          pageTabs: firstPage.publishedPageTabs ?? firstPage.pageTabs,
        };
      }

      return null;
    }

    // Walk the path from root to leaf using published fields
    let parentId: string | undefined = undefined;

    for (let i = 0; i < path.length; i++) {
      const slug = path[i]!;
      const isLast = i === path.length - 1;

      // Find page with this published slug under current parent
      const page = deployedPages.find(
        (p) =>
          (p.publishedSlug ?? p.slug) === slug &&
          (p.publishedParentId ?? p.parentId) === parentId,
      );

      if (!page) {
        // Fallback: try single-slug lookup for backwards compatibility
        if (path.length === 1) {
          return (
            deployedPages.find(
              (p) => (p.publishedSlug ?? p.slug) === path[0]!,
            ) ?? null
          );
        }
        return null;
      }

      if (isLast) {
        // Return with published fields projected as primary fields
        return {
          ...page,
          title: page.publishedTitle ?? page.title,
          slug: page.publishedSlug ?? page.slug,
          icon: page.publishedIcon ?? page.icon,
          order: page.publishedOrder ?? page.order,
          parentId: page.publishedParentId ?? page.parentId,
          pageTabs: page.publishedPageTabs ?? page.pageTabs,
        };
      }

      parentId = page._id;
    }

    return null;
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
