import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthContext } from "../auth";

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
    const auth = await getAuthContext(ctx);

    // Verify access to site
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    // Check slug uniqueness
    const existing = await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) => q.eq("siteId", siteId).eq("slug", slug))
      .first();

    if (existing) {
      throw new Error("Page slug already exists");
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
    const auth = await getAuthContext(ctx);

    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    // Check slug uniqueness if changing
    if (slug && slug !== page.slug) {
      const existing = await ctx.db
        .query("pages")
        .withIndex("by_slug", (q) =>
          q.eq("siteId", page.siteId).eq("slug", slug),
        )
        .first();

      if (existing) {
        throw new Error("Page slug already exists");
      }
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (title !== undefined) updates.title = title;
    if (slug !== undefined) updates.slug = slug.toLowerCase();
    if (icon !== undefined) updates.icon = icon;
    if (isPublished !== undefined) updates.isPublished = isPublished;

    await ctx.db.patch(pageId, updates);
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
    const auth = await getAuthContext(ctx);

    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    // Update order for each page based on its position in the array
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
  ctx: { db: any },
  pageId: string,
  siteId: string,
) {
  // Delete all blocks
  const blocks = await ctx.db
    .query("blocks")
    .withIndex("by_page", (q: any) => q.eq("pageId", pageId))
    .collect();

  for (const block of blocks) {
    await ctx.db.delete(block._id);
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

// Delete page
export const remove = mutation({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    const auth = await getAuthContext(ctx);

    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

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

    return { success: true };
  },
});
