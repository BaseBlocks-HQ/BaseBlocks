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
        q.eq("siteId", siteId).eq("parentId", parentId)
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
          q.eq("siteId", page.siteId).eq("slug", slug)
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

// Reorder page
export const reorder = mutation({
  args: {
    pageId: v.id("pages"),
    newOrder: v.number(),
    newParentId: v.optional(v.id("pages")),
  },
  handler: async (ctx, { pageId, newOrder, newParentId }) => {
    const auth = await getAuthContext(ctx);

    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    // Get siblings in new location
    const siblings = await ctx.db
      .query("pages")
      .withIndex("by_parent", (q) =>
        q.eq("siteId", page.siteId).eq("parentId", newParentId)
      )
      .collect();

    // Update orders
    for (const sibling of siblings) {
      if (sibling._id === pageId) continue;
      if (sibling.order >= newOrder) {
        await ctx.db.patch(sibling._id, { order: sibling.order + 1 });
      }
    }

    await ctx.db.patch(pageId, {
      order: newOrder,
      parentId: newParentId,
      updatedAt: Date.now(),
    });

    return pageId;
  },
});

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

    // Delete all blocks
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .collect();

    for (const block of blocks) {
      await ctx.db.delete(block._id);
    }

    // Recursively delete child pages
    const children = await ctx.db
      .query("pages")
      .withIndex("by_parent", (q) =>
        q.eq("siteId", page.siteId).eq("parentId", pageId)
      )
      .collect();

    for (const child of children) {
      // This will recursively delete blocks and children
      await ctx.db.delete(child._id);
    }

    await ctx.db.delete(pageId);

    return { success: true };
  },
});
