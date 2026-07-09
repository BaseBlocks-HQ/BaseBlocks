// Flattened Convex domain module. Keep this file as the public API for this domain.
import { createLayoutDraft } from "@baseblocks/domain";
import { nanoid } from "nanoid";
import type { GenericMutationCtx } from "convex/server";
import { v } from "convex/values";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import { query, mutation } from "./_generated/server";
import { checkIsMember, getAuthContextOrNull, requireContentEditor } from "./permissions";
import { indexPageContent, removePageContentIndex } from "./search";
import {
  canViewerAccessPublishedPageById,
  getAccessiblePublishedPages,
  pageAccessPolicyValidator,
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
  pageTabs?: Array<{ id: string; label: string }>;
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
  pageTabs?: Array<{ id: string; label: string }>;
};

/**
 * Build a tree structure from a flat array of pages.
 * Shared by both getTree (draft) and getTreePublished (published).
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
    pageTabs: page.pageTabs,
    showInNavigation: page.showInNavigation,
    updatedAt: page.updatedAt,
  };
}

function resolvePublishedPageByPath(
  publishedPages: Doc<"pages">[],
  site: { defaultPageId?: string },
  path: string[],
): Doc<"pages"> | null {
  if (path.length === 0) {
    if (site.defaultPageId) {
      const defaultPage = publishedPages.find(
        (p) => p._id === site.defaultPageId,
      );
      if (defaultPage) {
        return defaultPage;
      }
    }

    const rootPages = publishedPages
      .filter((p) => !p.parentId)
      .sort((a, b) => a.order - b.order);

    return rootPages[0] ?? null;
  }

  let parentId: string | undefined;

  for (let i = 0; i < path.length; i++) {
    const slug = path[i]!;
    const isLast = i === path.length - 1;

    const page = publishedPages.find(
      (p) => p.slug === slug && p.parentId === parentId,
    );

    if (!page) {
      if (path.length === 1) {
        return publishedPages.find((p) => p.slug === path[0]!) ?? null;
      }
      return null;
    }

    if (isLast) {
      return page;
    }

    parentId = page._id;
  }

  return null;
}

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

      while (currentPage?.parentId) {
        const parent = accessiblePageMap.get(currentPage.parentId);
        if (!parent) break;

        ancestors.unshift({
          _id: parent._id,
          title: parent.title,
          slug: parent.slug,
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

export const getTreePublished = query({
  args: {
    siteId: v.id("sites"),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { siteId, sessionTokens }) => {
    const site = await ctx.db.get(siteId);
    if (!site?.isPublished) return [];

    const publishedPages = (
      await getAccessiblePublishedPages(ctx, site, sessionTokens)
    ).filter((page) => page.showInNavigation !== false);

    return buildPageTree(
      publishedPages.map((page) => ({
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

// Get published page by nested path (for public routing)
export const getByPathPublished = query({
  args: {
    siteId: v.id("sites"),
    path: v.array(v.string()),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { siteId, path, sessionTokens }) => {
    const site = await ctx.db.get(siteId);
    if (!site?.isPublished) return null;

    const publishedPages = await getAccessiblePublishedPages(
      ctx,
      site,
      sessionTokens,
    );
    const page = resolvePublishedPageByPath(
      publishedPages,
      { defaultPageId: site.defaultPageId },
      path,
    );
    return page ? projectPublishedPage(page) : null;
  },
});

export const getByPathPublishedStatus = query({
  args: {
    siteId: v.id("sites"),
    path: v.array(v.string()),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { siteId, path, sessionTokens }) => {
    const site = await ctx.db.get(siteId);
    if (!site?.isPublished) {
      return { status: "missing" as const };
    }

    if (path.length === 0) {
      return { status: "accessible" as const };
    }

    const [accessiblePages, allPublishedPages] = await Promise.all(
      [
        getAccessiblePublishedPages(ctx, site, sessionTokens),
        ctx.db
          .query("pages")
          .withIndex("by_site", (q) => q.eq("siteId", siteId))
          .collect(),
      ],
    );
    const defaultPage = { defaultPageId: site.defaultPageId };

    const accessiblePage = resolvePublishedPageByPath(
      accessiblePages,
      defaultPage,
      path,
    );
    if (accessiblePage) {
      return { status: "accessible" as const };
    }

    const existingPage = resolvePublishedPageByPath(
      allPublishedPages,
      defaultPage,
      path,
    );
    return {
      status: existingPage ? ("forbidden" as const) : ("missing" as const),
    };
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
    if (!site?.isPublished) return [];

    const publishedPages = (await getAccessiblePublishedPages(ctx, site)).filter(
      (page) => page.showInNavigation !== false,
    );

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

function createEditorId(): string {
  return Math.random().toString(36).slice(2, 12);
}

async function validateAudienceIdsForSite(
  ctx: Pick<GenericMutationCtx<DataModel>, "db">,
  siteId: Id<"sites">,
  audienceIds: Id<"siteAudiences">[],
): Promise<void> {
  const uniqueAudienceIds = Array.from(new Set(audienceIds));
  for (const audienceId of uniqueAudienceIds) {
    const audience = await ctx.db.get(audienceId);
    if (!audience || audience.siteId !== siteId) {
      throw new Error("Invalid audience selection");
    }
  }
}

// Create a new page
export const create = mutation({
  args: {
    siteId: v.id("sites"),
    title: v.string(),
    slug: v.string(),
    parentId: v.optional(v.id("pages")),
    icon: v.optional(v.string()),
    showInNavigation: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { siteId, title, slug, parentId, icon, showInNavigation },
  ) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    const { auth } = await requireContentEditor(ctx, site.teamId);

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
      showInNavigation,
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });

    return pageId;
  },
});

export const setExposure = mutation({
  args: {
    pageId: v.id("pages"),
    exposure: v.union(
      v.literal("navigation"),
      v.literal("block"),
      v.literal("both"),
    ),
    targetPageId: v.optional(v.id("pages")),
    targetLayoutId: v.optional(v.id("layouts")),
    targetSlotId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { pageId, exposure, targetPageId, targetLayoutId, targetSlotId },
  ) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireContentEditor(ctx, site.teamId);

    const now = Date.now();
    const layouts = await ctx.db
      .query("layouts")
      .withIndex("by_site", (q) => q.eq("siteId", page.siteId))
      .collect();

    const removeReferences = async () => {
      for (const layout of layouts) {
        let changed = false;
        const nextSlots = layout.slots.map((slot) => {
          const nextBlocks = slot.blocks.filter((block) => {
            if (block.type !== "page") return true;
            const linkedPageId = block.content?.pageId;
            const shouldKeep = linkedPageId !== pageId;
            if (!shouldKeep) {
              changed = true;
            }
            return shouldKeep;
          });

          if (nextBlocks.length === slot.blocks.length) {
            return slot;
          }

          return {
            ...slot,
            blocks: nextBlocks,
          };
        });

        if (!changed) continue;

        await ctx.db.patch(layout._id, {
          slots: nextSlots,
          updatedAt: now,
        });
        await ctx.db.patch(layout.pageId, { updatedAt: now });
      }
    };

    const ensureReferenceOnTargetPage = async () => {
      if (!targetPageId || targetPageId === pageId) return;

      const targetPage = await ctx.db.get(targetPageId);
      if (!targetPage || targetPage.siteId !== page.siteId) return;

      const targetLayouts = layouts
        .filter((layout) => layout.pageId === targetPageId)
        .sort((a, b) => a.order - b.order);

      const existingReference = targetLayouts.some((layout) =>
        layout.slots.some((slot) =>
          slot.blocks.some(
            (block) =>
              block.type === "page" && block.content?.pageId === pageId,
          ),
        ),
      );

      if (existingReference) return;

      const requestedLayout = targetLayoutId
        ? targetLayouts.find((layout) => layout._id === targetLayoutId)
        : undefined;

      const targetLayout =
        requestedLayout && requestedLayout.slots.length > 0
          ? requestedLayout
          : targetLayouts.find((layout) => layout.slots.length > 0);

      if (!targetLayout) {
        const layoutDraft = createLayoutDraft({
          createId: createEditorId,
          type: "single",
        });
        const firstSlot = layoutDraft.slots[0];
        if (!firstSlot) return;
        await ctx.db.insert("layouts", {
          siteId: page.siteId,
          pageId: targetPageId,
          type: layoutDraft.type,
          slots: [
            {
              ...firstSlot,
              blocks: [
                {
                  id: `page-${pageId}-${now}`,
                  type: "page",
                  content: { pageId },
                },
              ],
            },
          ],
          settings: layoutDraft.settings,
          order: 0,
          createdAt: now,
          updatedAt: now,
        });
        await ctx.db.patch(targetPageId, { updatedAt: now });
        return;
      }

      const targetSlot =
        (targetSlotId
          ? targetLayout.slots.find((slot) => slot.id === targetSlotId)
          : undefined) ?? targetLayout.slots[0];
      if (!targetSlot) return;

      const nextSlots = targetLayout.slots.map((slot) =>
        slot.id === targetSlot.id
          ? {
              ...slot,
              blocks: [
                ...slot.blocks,
                {
                  id: `page-${pageId}-${now}`,
                  type: "page" as const,
                  content: { pageId },
                },
              ],
            }
          : slot,
      );

      await ctx.db.patch(targetLayout._id, {
        slots: nextSlots,
        updatedAt: now,
      });
      await ctx.db.patch(targetPageId, { updatedAt: now });
    };

    if (exposure === "navigation") {
      await removeReferences();
      await ctx.db.patch(pageId, {
        showInNavigation: true,
        updatedAt: now,
      });
      return { exposure };
    }

    if (exposure === "block") {
      await ensureReferenceOnTargetPage();
      await ctx.db.patch(pageId, {
        showInNavigation: false,
        updatedAt: now,
      });
      return { exposure };
    }

    await ensureReferenceOnTargetPage();
    await ctx.db.patch(pageId, {
      showInNavigation: true,
      updatedAt: now,
    });
    return { exposure };
  },
});

// Update page
export const update = mutation({
  args: {
    pageId: v.id("pages"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    icon: v.optional(v.string()),
    showInNavigation: v.optional(v.boolean()),
  },
  handler: async (ctx, { pageId, title, slug, icon, showInNavigation }) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireContentEditor(ctx, site.teamId);

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
    if (showInNavigation !== undefined) {
      updates.showInNavigation = showInNavigation;
    }

    await ctx.db.patch(pageId, updates);

    // Re-index if title changed (title is part of the search index)
    if (title !== undefined) {
      await indexPageContent(ctx, pageId);
    }

    return pageId;
  },
});

export const updateAccessPolicy = mutation({
  args: {
    pageId: v.id("pages"),
    accessPolicy: pageAccessPolicyValidator,
  },
  handler: async (ctx, { pageId, accessPolicy }) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireContentEditor(ctx, site.teamId);

    if (
      accessPolicy.kind === "audiences" &&
      accessPolicy.audienceIds.length === 0
    ) {
      throw new Error("Choose at least one audience");
    }

    if (accessPolicy.kind === "audiences") {
      await validateAudienceIdsForSite(ctx, site._id, accessPolicy.audienceIds);
    }

    await ctx.db.patch(pageId, {
      accessPolicy,
      updatedAt: Date.now(),
    });

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

    await requireContentEditor(ctx, site.teamId);

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
  // Delete all layouts for this page
  const layouts = await ctx.db
    .query("layouts")
    .withIndex("by_page", (q) => q.eq("pageId", pageId))
    .collect();

  for (const layout of layouts) {
    await ctx.db.delete(layout._id);
  }

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

    await requireContentEditor(ctx, site.teamId);

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

// Update page tabs configuration
export const updatePageTabs = mutation({
  args: {
    pageId: v.id("pages"),
    pageTabs: v.optional(
      v.array(
        v.object({
          id: v.string(),
          label: v.string(),
        }),
      ),
    ),
  },
  handler: async (ctx, { pageId, pageTabs }) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireContentEditor(ctx, site.teamId);

    await ctx.db.patch(pageId, {
      pageTabs,
      updatedAt: Date.now(),
    });

    return pageId;
  },
});

// Enable page tabs - creates tabs and assigns all existing layouts to Tab 1
export const enablePageTabs = mutation({
  args: {
    pageId: v.id("pages"),
    tabs: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
      }),
    ),
  },
  handler: async (ctx, { pageId, tabs }) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireContentEditor(ctx, site.teamId);

    // Skip if tabs already enabled
    if (page.pageTabs && page.pageTabs.length > 0) {
      return pageId;
    }

    const existingLayouts = await ctx.db
      .query("layouts")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .collect();

    const now = Date.now();
    const firstTabId = tabs[0]?.id;

    // Assign all existing layouts to the first tab
    if (firstTabId) {
      for (const layout of existingLayouts) {
        await ctx.db.patch(layout._id, { tabId: firstTabId, updatedAt: now });
      }
    }

    await ctx.db.patch(pageId, {
      pageTabs: tabs,
      updatedAt: now,
    });

    return pageId;
  },
});

// Disable page tabs - removes pageTabs and clears tabId from all layouts
export const disablePageTabs = mutation({
  args: {
    pageId: v.id("pages"),
  },
  handler: async (ctx, { pageId }) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireContentEditor(ctx, site.teamId);

    const layouts = await ctx.db
      .query("layouts")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .collect();

    const now = Date.now();
    for (const layout of layouts) {
      await ctx.db.patch(layout._id, { tabId: undefined, updatedAt: now });
    }

    await ctx.db.patch(pageId, {
      pageTabs: undefined,
      updatedAt: now,
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

    await requireContentEditor(ctx, site.teamId);

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
