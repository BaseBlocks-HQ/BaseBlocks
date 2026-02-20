import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { requireAdmin } from "../auth";
import { markSiteModified } from "../lib/markModified";

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
    // Verify access to site
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    // Require admin access for write operations
    const { auth } = await requireAdmin(ctx, site.teamId);

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
      isPublished: false,
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });

    await markSiteModified(ctx, siteId);

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
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, { pageId, title, slug, icon, isPublished }) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    // Require admin access for write operations
    await requireAdmin(ctx, site.teamId);

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
    if (isPublished !== undefined) updates.isPublished = isPublished;

    await ctx.db.patch(pageId, updates);
    await markSiteModified(ctx, page.siteId);

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
  handler: async (ctx, { siteId, parentId, pageIds }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    // Require admin access for write operations
    await requireAdmin(ctx, site.teamId);

    // Update order for each page based on its position in the array
    const now = Date.now();
    for (let i = 0; i < pageIds.length; i++) {
      const pageId = pageIds[i];
      if (pageId) {
        await ctx.db.patch(pageId, { order: i, updatedAt: now });
      }
    }

    await markSiteModified(ctx, siteId);

    return pageIds;
  },
});

// Helper to recursively delete a page and its children
async function deletePageRecursively(
  ctx: { db: any },
  pageId: string,
  siteId: string,
) {
  // Delete all layouts for this page
  const layouts = await ctx.db
    .query("layouts")
    .withIndex("by_page", (q: any) => q.eq("pageId", pageId))
    .collect();

  for (const layout of layouts) {
    await ctx.db.delete(layout._id);
  }

  // Recursively delete child pages
  const children = await ctx.db
    .query("pages")
    .withIndex("by_parent", (q: any) =>
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
    // Get page and verify exists
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    // Require admin access for write operations
    await requireAdmin(ctx, site.teamId);

    // Verify new parent exists if specified
    if (newParentId) {
      const parent = await ctx.db.get(newParentId);
      if (!parent || parent.siteId !== page.siteId) {
        throw new Error("Target page not found");
      }

      // Prevent moving page into itself or its descendants
      // Walk up the parent chain from newParentId to check for circular reference
      let checkId: Id<"pages"> | undefined = newParentId;
      while (checkId) {
        if (checkId === pageId) {
          throw new Error("Cannot move page into itself or its descendants");
        }
        const checkPage: Doc<"pages"> | null = await ctx.db.get(checkId);
        checkId = checkPage?.parentId;
      }
    }

    // Update the page with new parent and order
    await ctx.db.patch(pageId, {
      parentId: newParentId,
      order: newOrder,
      updatedAt: Date.now(),
    });

    await markSiteModified(ctx, page.siteId);

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

    await requireAdmin(ctx, site.teamId);

    await ctx.db.patch(pageId, {
      pageTabs,
      updatedAt: Date.now(),
    });

    await markSiteModified(ctx, page.siteId);

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

    await requireAdmin(ctx, site.teamId);

    // Skip if tabs already enabled
    if (page.pageTabs && page.pageTabs.length > 0) {
      return pageId;
    }

    // Get all existing layouts for this page
    const existingLayouts = await ctx.db
      .query("layouts")
      .withIndex("by_page", (q: any) => q.eq("pageId", pageId))
      .collect();

    const now = Date.now();
    const firstTabId = tabs[0]?.id;

    // Assign all existing layouts to the first tab
    if (firstTabId) {
      for (const layout of existingLayouts) {
        await ctx.db.patch(layout._id, { tabId: firstTabId, updatedAt: now });
      }
    }

    // Set pageTabs on the page
    await ctx.db.patch(pageId, {
      pageTabs: tabs,
      updatedAt: now,
    });

    await markSiteModified(ctx, page.siteId);

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

    await requireAdmin(ctx, site.teamId);

    // Clear tabId from all layouts
    const layouts = await ctx.db
      .query("layouts")
      .withIndex("by_page", (q: any) => q.eq("pageId", pageId))
      .collect();

    const now = Date.now();
    for (const layout of layouts) {
      await ctx.db.patch(layout._id, { tabId: undefined, updatedAt: now });
    }

    // Remove pageTabs from page
    await ctx.db.patch(pageId, {
      pageTabs: undefined,
      updatedAt: now,
    });

    await markSiteModified(ctx, page.siteId);

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

    // Require admin access for write operations
    await requireAdmin(ctx, site.teamId);

    // Check if this is the default page
    const isDefaultPage = site.defaultPageId === pageId;

    // Get all root-level pages (excluding the one being deleted and its children)
    const allPages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", page.siteId))
      .collect();

    // Find pages that will remain after deletion (excluding this page and its descendants)
    const pagesToDelete = new Set<string>([pageId]);

    // Collect all descendant IDs
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
      // Find the first root-level page or fall back to first page
      const firstRootPage = remainingPages.find((p) => !p.parentId);
      const newDefaultPage = firstRootPage ?? remainingPages[0];

      if (newDefaultPage) {
        await ctx.db.patch(site._id, {
          defaultPageId: newDefaultPage._id,
          updatedAt: Date.now(),
        });
      } else {
        // No pages left, clear the default
        await ctx.db.patch(site._id, {
          defaultPageId: undefined,
          updatedAt: Date.now(),
        });
      }
    }

    // Delete the page and all its descendants
    await deletePageRecursively(ctx, pageId, page.siteId);

    await markSiteModified(ctx, page.siteId);

    return { success: true };
  },
});
