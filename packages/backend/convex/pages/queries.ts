import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { checkIsMember, getAuthContextOrNull } from "../auth";
import {
  canViewerAccessPublishedPageById,
  getAccessiblePublishedPages,
} from "../lib/pageAccess";
import { buildPageTree } from "../lib/tree";

// List pages for a site (authenticated — editor only)
export const list = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return [];

    if (!(await checkIsMember(ctx, site.teamId))) return [];

    const pages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    const layouts = await ctx.db
      .query("layouts")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    const referencedPageIds = new Set<string>();
    for (const layout of layouts) {
      for (const slot of layout.slots) {
        for (const block of slot.blocks) {
          if (block.type !== "page") continue;
          const pageId = block.content?.pageId;
          if (typeof pageId === "string") {
            referencedPageIds.add(pageId);
          }
        }
      }
    }

    return pages.map((page) => ({
      ...page,
      hasPageBlockReference: referencedPageIds.has(page._id),
    }));
  },
});

// Get page by ID (authenticated — requires team membership)
export const get = query({
  args: {
    pageId: v.id("pages"),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { pageId, sessionTokens }) => {
    const page = await ctx.db.get(pageId);
    if (!page) return null;

    const site = await ctx.db.get(page.siteId);
    if (!site) return null;

    const auth = await getAuthContextOrNull(ctx);
    if (auth) {
      const member = await ctx.db
        .query("members")
        .withIndex("by_team_user", (q) =>
          q.eq("teamId", site.teamId).eq("userId", auth.userId),
        )
        .first();
      if (member) return page;
    }

    if (await canViewerAccessPublishedPageById(ctx, pageId, sessionTokens)) {
      return page;
    }

    return null;
  },
});

// Get page by slug (authenticated or published)
export const getBySlug = query({
  args: {
    siteId: v.id("sites"),
    slug: v.string(),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { siteId, slug, sessionTokens }) => {
    const page = await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) => q.eq("siteId", siteId).eq("slug", slug))
      .first();

    if (!page) return null;

    // Verify access
    const site = await ctx.db.get(siteId);
    if (!site) return null;

    const auth = await getAuthContextOrNull(ctx);
    if (auth) {
      const member = await ctx.db
        .query("members")
        .withIndex("by_team_user", (q) =>
          q.eq("teamId", site.teamId).eq("userId", auth.userId),
        )
        .first();
      if (member) return page;
    }

    if (
      page.isDeployed &&
      (await canViewerAccessPublishedPageById(ctx, page._id, sessionTokens))
    ) {
      return page;
    }

    return null;
  },
});

// Get child pages (requires membership or published site)
export const getChildren = query({
  args: {
    siteId: v.id("sites"),
    parentId: v.optional(v.id("pages")),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { siteId, parentId, sessionTokens }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return [];

    // Check access: team member or published site
    const auth = await getAuthContextOrNull(ctx);
    let isMember = false;
    if (auth) {
      const member = await ctx.db
        .query("members")
        .withIndex("by_team_user", (q) =>
          q.eq("teamId", site.teamId).eq("userId", auth.userId),
        )
        .first();
      isMember = !!member;
    }

    if (!isMember) {
      const accessiblePages = await getAccessiblePublishedPages(
        ctx,
        site,
        sessionTokens,
      );

      return accessiblePages
        .filter(
          (page) => (page.publishedParentId ?? page.parentId) === parentId,
        )
        .sort(
          (a, b) =>
            (a.publishedOrder ?? a.order) - (b.publishedOrder ?? b.order),
        );
    }

    const pages = await ctx.db
      .query("pages")
      .withIndex("by_parent", (q) =>
        q.eq("siteId", siteId).eq("parentId", parentId),
      )
      .collect();

    pages.sort((a, b) => a.order - b.order);
    return pages;
  },
});

// Build page tree (for editor navigation — uses draft fields)
export const getTree = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return [];

    if (!(await checkIsMember(ctx, site.teamId))) return [];

    const allPages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    return buildPageTree(
      allPages.map((page) => ({
        _id: page._id,
        siteId: page.siteId,
        title: page.title,
        slug: page.slug,
        icon: page.icon,
        order: page.order,
        parentId: page.parentId,
        pageTabs: page.pageTabs,
      })),
    );
  },
});

// Get page by nested path (e.g., ["docs", "api", "endpoints"])
// Authenticated — requires team membership
export const getByPath = query({
  args: {
    siteId: v.id("sites"),
    path: v.array(v.string()),
  },
  handler: async (ctx, { siteId, path }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return null;

    if (!(await checkIsMember(ctx, site.teamId))) return null;

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

// Get ancestors of a page (for breadcrumbs — requires membership or published site)
export const getAncestors = query({
  args: {
    pageId: v.id("pages"),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { pageId, sessionTokens }) => {
    const page = await ctx.db.get(pageId);
    if (!page) return [];

    const site = await ctx.db.get(page.siteId);
    if (!site) return [];

    // Check access: team member or published site
    const auth = await getAuthContextOrNull(ctx);
    let isMember = false;
    if (auth) {
      const member = await ctx.db
        .query("members")
        .withIndex("by_team_user", (q) =>
          q.eq("teamId", site.teamId).eq("userId", auth.userId),
        )
        .first();
      isMember = !!member;
    }

    if (!isMember) {
      const accessiblePages = await getAccessiblePublishedPages(
        ctx,
        site,
        sessionTokens,
      );
      const accessiblePageMap = new Map(
        accessiblePages.map((accessiblePage) => [
          accessiblePage._id,
          accessiblePage,
        ]),
      );
      if (!accessiblePageMap.has(pageId)) {
        return [];
      }

      const ancestors: Array<{
        _id: string;
        title: string;
        slug: string;
      }> = [];

      let currentPage = accessiblePageMap.get(pageId) ?? null;

      while (
        currentPage &&
        (currentPage.publishedParentId ?? currentPage.parentId)
      ) {
        const parent = accessiblePageMap.get(
          (currentPage.publishedParentId ??
            currentPage.parentId) as Id<"pages">,
        );
        if (!parent) break;

        ancestors.unshift({
          _id: parent._id,
          title: parent.publishedTitle ?? parent.title,
          slug: parent.publishedSlug ?? parent.slug,
        });

        currentPage = parent;
      }

      return ancestors;
    }

    const ancestors: Array<{
      _id: string;
      title: string;
      slug: string;
    }> = [];

    let currentPage = page;

    while (currentPage?.parentId) {
      const parent = await ctx.db.get(currentPage.parentId);
      if (!parent) break;

      // For public access, only include deployed pages with published fields
      if (!isMember && !parent.isDeployed) break;

      ancestors.unshift({
        _id: parent._id,
        title: isMember
          ? parent.title
          : (parent.publishedTitle ?? parent.title),
        slug: isMember ? parent.slug : (parent.publishedSlug ?? parent.slug),
      });

      currentPage = parent;
    }

    return ancestors;
  },
});

// Build published page tree (for public navigation)
// Uses publishedTitle, publishedSlug, publishedOrder, publishedParentId
// Only includes pages that have been deployed on published sites
export const getTreePublished = query({
  args: {
    siteId: v.id("sites"),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { siteId, sessionTokens }) => {
    const site = await ctx.db.get(siteId);
    if (!site || !site.isPublished) return [];

    const deployedPages = (
      await getAccessiblePublishedPages(ctx, site, sessionTokens)
    ).filter((page) => page.showInNavigation !== false);

    // Project to published fields (fall back to draft for migration compat)
    return buildPageTree(
      deployedPages.map((page) => ({
        _id: page._id,
        siteId: page.siteId,
        title: page.publishedTitle ?? page.title,
        slug: page.publishedSlug ?? page.slug,
        icon: page.publishedIcon ?? page.icon,
        order: page.publishedOrder ?? page.order,
        parentId: page.publishedParentId ?? page.parentId,
        pageTabs: page.publishedPageTabs ?? page.pageTabs,
      })),
    );
  },
});

// Get published page by nested path (for public routing)
export const getByPathPublished = query({
  args: {
    siteId: v.id("sites"),
    path: v.array(v.string()),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { siteId, path, sessionTokens }) => {
    const site = await ctx.db.get(siteId);
    if (!site || !site.isPublished) return null;

    const deployedPages = await getAccessiblePublishedPages(
      ctx,
      site,
      sessionTokens,
    );

    // Empty path: resolve via site's defaultPageId, then fall back to first root page
    if (path.length === 0) {
      const resolvedDefaultPageId =
        site.defaultPageId ?? site.publishedDefaultPageId;

      if (resolvedDefaultPageId) {
        const defaultPage = deployedPages.find(
          (p) => p._id === resolvedDefaultPageId,
        );
        if (defaultPage) {
          return projectPublishedPage(defaultPage);
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
      return firstPage ? projectPublishedPage(firstPage) : null;
    }

    // Walk the path from root to leaf using published fields
    let parentId: string | undefined = undefined;

    for (let i = 0; i < path.length; i++) {
      const slug = path[i]!;
      const isLast = i === path.length - 1;

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
        return projectPublishedPage(page);
      }

      parentId = page._id;
    }

    return null;
  },
});

// Get full URL path for a page (e.g., "docs/api/endpoints")
// Authenticated — requires team membership (exposes draft slugs)
export const getFullPath = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    const page = await ctx.db.get(pageId);
    if (!page) return null;

    const site = await ctx.db.get(page.siteId);
    if (!site) return null;

    if (!(await checkIsMember(ctx, site.teamId))) return null;

    const slugs: string[] = [];
    let currentPage: typeof page | null = page;

    while (currentPage) {
      slugs.unshift(currentPage.slug);
      if (!currentPage.parentId) break;
      currentPage = await ctx.db.get(currentPage.parentId);
    }

    return slugs.join("/");
  },
});

// List deployed page paths for a published site (for sitemap generation)
// No auth required — only returns public-safe data for published sites
export const listDeployedPaths = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site || !site.isPublished) return [];

    const deployedPages = (await getAccessiblePublishedPages(ctx, site)).filter(
      (page) => page.showInNavigation !== false,
    );

    // Build a map of page ID → published slug for path resolution
    const slugMap = new Map(
      deployedPages.map((p) => [p._id, p.publishedSlug ?? p.slug]),
    );
    const parentMap = new Map(
      deployedPages.map((p) => [p._id, p.publishedParentId ?? p.parentId]),
    );

    // Resolve full path for each page
    function getFullPath(pageId: Id<"pages">): string {
      const slugs: string[] = [];
      let currentId: Id<"pages"> | undefined = pageId;
      while (currentId) {
        const slug = slugMap.get(currentId);
        if (!slug) break;
        slugs.unshift(slug);
        currentId = parentMap.get(currentId) as Id<"pages"> | undefined;
      }
      return slugs.join("/");
    }

    return deployedPages.map((page) => ({
      path: getFullPath(page._id),
      updatedAt: page.updatedAt,
    }));
  },
});

// Helper: project a page document to use published fields as primary
function projectPublishedPage(page: {
  _id: string;
  title: string;
  slug: string;
  icon?: string;
  order: number;
  parentId?: string;
  pageTabs?: Array<{ id: string; label: string }>;
  publishedTitle?: string;
  publishedSlug?: string;
  publishedIcon?: string;
  publishedOrder?: number;
  publishedParentId?: string;
  publishedPageTabs?: Array<{ id: string; label: string }>;
  [key: string]: unknown;
}) {
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
