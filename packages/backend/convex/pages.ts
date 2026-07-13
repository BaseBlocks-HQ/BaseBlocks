import type { GenericMutationCtx } from "convex/server";
import { v } from "convex/values";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import { query, mutation } from "./_generated/server";
import {
  isOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";
import { indexPageContent, removePageContentIndex } from "./search";
import {
  createDefaultPageStructure,
  deletePageStructure,
} from "./pageStructure";
import {
  canViewerAccessPublishedPageById,
  getAccessiblePublishedPages,
} from "./sharing";

/**
 * A page node in the tree structure.
 * Used for both draft and published page trees.
 */
export type PageTreeNode = {
  _id: string;
  siteId: Doc<"pages">["siteId"];
  title: string;
  slug: string;
  icon?: string;
  order: number;
  parentId?: string;
  children: PageTreeNode[];
};

type ProjectedPage = {
  _id: string;
  siteId: Doc<"pages">["siteId"];
  title: string;
  slug: string;
  icon?: string;
  order: number;
  parentId?: string;
};

/**
 * Build a tree structure from a flat array of pages.
 * Builds the nested page tree used by editor and published read models.
 *
 * @param pages - Flat array of page data (already projected to the right fields)
 * @returns Root-level tree nodes with nested children, sorted by order
 */
export function buildPageTree(pages: ProjectedPage[]): PageTreeNode[] {
  const pageMap = new Map<string, PageTreeNode>();
  const rootPages: PageTreeNode[] = [];

  // First pass: create map with empty children
  for (const page of pages) {
    pageMap.set(page._id, { ...page, children: [] });
  }

  // Second pass: build tree
  for (const node of pageMap.values()) {
    if (node.parentId) {
      const parent = pageMap.get(node.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // Parent not in set (e.g., not deployed), treat as root
        rootPages.push(node);
      }
    } else {
      rootPages.push(node);
    }
  }

  // Sort children by order recursively
  sortChildren(rootPages);

  return rootPages;
}

function sortChildren(pages: PageTreeNode[]) {
  pages.sort((a, b) => a.order - b.order);
  for (const page of pages) {
    sortChildren(page.children);
  }
}

function projectPublishedPage(page: Doc<"pages">) {
  return {
    _id: page._id,
    siteId: page.siteId,
    title: page.title,
    slug: page.slug,
    icon: page.icon,
    order: page.order,
    parentId: page.parentId,
    updatedAt: page.updatedAt,
  };
}

// List pages for a site (authenticated — editor only)
export const list = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return [];

    if (!(await isOrganizationMember(ctx, site.organizationId))) return [];

    const pages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    return pages;
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

    if (await isOrganizationMember(ctx, site.organizationId)) return page;

    if (await canViewerAccessPublishedPageById(ctx, pageId, sessionTokens)) {
      return projectPublishedPage(page);
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

    if (await isOrganizationMember(ctx, site.organizationId)) return page;

    if (await canViewerAccessPublishedPageById(ctx, page._id, sessionTokens)) {
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
    const isMember = await isOrganizationMember(ctx, site.organizationId);

    if (!isMember) {
      const accessiblePages = await getAccessiblePublishedPages(
        ctx,
        site,
        sessionTokens,
      );

      return accessiblePages
        .filter((page) => page.parentId === parentId)
        .sort((a, b) => a.order - b.order);
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

    if (!(await isOrganizationMember(ctx, site.organizationId))) return [];

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

    if (!(await isOrganizationMember(ctx, site.organizationId))) return null;

    // Empty path defaults to "home"
    if (path.length === 0) {
      return await ctx.db
        .query("pages")
        .withIndex("by_slug", (q) => q.eq("siteId", siteId).eq("slug", "home"))
        .first();
    }

    // Walk the path from root to leaf
    let parentId: Id<"pages"> | undefined;

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

// Get full URL path for a page (e.g., "docs/api/endpoints")
// Authenticated — requires team membership (exposes draft slugs)
export const getFullPath = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    const page = await ctx.db.get(pageId);
    if (!page) return null;

    const site = await ctx.db.get(page.siteId);
    if (!site) return null;

    if (!(await isOrganizationMember(ctx, site.organizationId))) return null;

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
    if (!site?.isPublished) return [];

    const publishedPages = await getAccessiblePublishedPages(ctx, site);

    const slugMap = new Map(publishedPages.map((p) => [p._id, p.slug]));
    const parentMap = new Map(publishedPages.map((p) => [p._id, p.parentId]));

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

    return publishedPages.map((page) => ({
      path: getFullPath(page._id),
      updatedAt: page.updatedAt,
    }));
  },
});

// Create a new page
export const create = mutation({
  args: {
    siteId: v.id("sites"),
    title: v.string(),
    slug: v.string(),
    parentId: v.optional(v.id("pages")),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, { siteId, title, slug, parentId, icon }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    const { auth } = await requireOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "content", action: "edit" },
    );

    // Check slug uniqueness
    const existing = await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) => q.eq("siteId", siteId).eq("slug", slug))
      .first();

    if (existing) {
      throw new Error(
        `A page with the URL "${slug}" already exists. Please choose a different title or URL slug.`,
      );
    }

    // Get max order for siblings
    const siblings = await ctx.db
      .query("pages")
      .withIndex("by_parent", (q) =>
        q.eq("siteId", siteId).eq("parentId", parentId),
      )
      .collect();

    const maxOrder = siblings.reduce((max, p) => Math.max(max, p.order), -1);

    const now = Date.now();
    const pageId = await ctx.db.insert("pages", {
      siteId,
      title,
      slug: slug.toLowerCase(),
      parentId,
      icon,
      order: maxOrder + 1,
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });

    await createDefaultPageStructure(ctx, { siteId, pageId, now });

    return pageId;
  },
});

// Update page
export const update = mutation({
  args: {
    pageId: v.id("pages"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, { pageId, title, slug, icon }) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "content",
      action: "edit",
    });

    // Check slug uniqueness if changing
    if (slug && slug !== page.slug) {
      const existing = await ctx.db
        .query("pages")
        .withIndex("by_slug", (q) =>
          q.eq("siteId", page.siteId).eq("slug", slug),
        )
        .first();

      if (existing) {
        throw new Error(
          `A page with the URL "${slug}" already exists. Please choose a different title or URL slug.`,
        );
      }
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (title !== undefined) updates.title = title;
    if (slug !== undefined) updates.slug = slug.toLowerCase();
    if (icon !== undefined) updates.icon = icon;

    await ctx.db.patch(pageId, updates);

    // Re-index if title changed (title is part of the search index)
    if (title !== undefined) {
      await indexPageContent(ctx, pageId);
    }

    return pageId;
  },
});

// Reorder pages within a parent - takes ordered array of page IDs
export const reorder = mutation({
  args: {
    siteId: v.id("sites"),
    parentId: v.optional(v.id("pages")),
    pageIds: v.array(v.id("pages")),
  },
  handler: async (ctx, { siteId, pageIds }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "content",
      action: "edit",
    });

    const now = Date.now();
    for (let i = 0; i < pageIds.length; i++) {
      const pageId = pageIds[i];
      if (pageId) {
        await ctx.db.patch(pageId, { order: i, updatedAt: now });
      }
    }

    return pageIds;
  },
});

// Helper to recursively delete a page and its children
async function deletePageRecursively(
  ctx: Pick<GenericMutationCtx<DataModel>, "db">,
  pageId: Id<"pages">,
  siteId: Id<"sites">,
) {
  await deletePageStructure(ctx, pageId);

  // Recursively delete child pages
  const children = await ctx.db
    .query("pages")
    .withIndex("by_parent", (q) =>
      q.eq("siteId", siteId).eq("parentId", pageId),
    )
    .collect();

  for (const child of children) {
    await deletePageRecursively(ctx, child._id, siteId);
  }

  await ctx.db.delete(pageId);
}

// Move page to new parent and/or position
export const move = mutation({
  args: {
    pageId: v.id("pages"),
    newParentId: v.optional(v.id("pages")),
    newOrder: v.number(),
  },
  handler: async (ctx, { pageId, newParentId, newOrder }) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "content",
      action: "edit",
    });

    // Verify new parent exists if specified
    if (newParentId) {
      const parent = await ctx.db.get(newParentId);
      if (!parent || parent.siteId !== page.siteId) {
        throw new Error("Target page not found");
      }

      // Prevent moving page into itself or its descendants
      let checkId: Id<"pages"> | undefined = newParentId;
      while (checkId) {
        if (checkId === pageId) {
          throw new Error("Cannot move page into itself or its descendants");
        }
        const checkPage: Doc<"pages"> | null = await ctx.db.get(checkId);
        checkId = checkPage?.parentId;
      }
    }

    await ctx.db.patch(pageId, {
      parentId: newParentId,
      order: newOrder,
      updatedAt: Date.now(),
    });

    return pageId;
  },
});

// Delete page
export const remove = mutation({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "content",
      action: "edit",
    });

    // Check if this is the default page
    const isDefaultPage = site.defaultPageId === pageId;

    // Get all pages for descendant collection
    const allPages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", page.siteId))
      .collect();

    // Collect all descendant IDs
    const pagesToDelete = new Set<string>([pageId]);
    const collectDescendants = (parentId: string) => {
      const children = allPages.filter((p) => p.parentId === parentId);
      for (const child of children) {
        pagesToDelete.add(child._id);
        collectDescendants(child._id);
      }
    };
    collectDescendants(pageId);

    const remainingPages = allPages
      .filter((p) => !pagesToDelete.has(p._id))
      .sort((a, b) => a.order - b.order);

    // If deleting the default page, reassign to first remaining page
    if (isDefaultPage) {
      const firstRootPage = remainingPages.find((p) => !p.parentId);
      const newDefaultPage = firstRootPage ?? remainingPages[0];

      if (newDefaultPage) {
        await ctx.db.patch(site._id, {
          defaultPageId: newDefaultPage._id,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.patch(site._id, {
          defaultPageId: undefined,
          updatedAt: Date.now(),
        });
      }
    }

    // Remove search index entries for all pages being deleted
    for (const id of pagesToDelete) {
      await removePageContentIndex(ctx, id as Id<"pages">);
    }

    await deletePageRecursively(ctx, pageId, page.siteId);

    return { success: true };
  },
});
