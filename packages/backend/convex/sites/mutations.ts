import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthContext, requireAdminOrLegacy } from "../auth";

// Create a new site
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, { name, slug }) => {
    const auth = await getAuthContext(ctx);
    const eaOrgId = auth.eaOrgId;

    if (!eaOrgId) {
      throw new Error("No organization selected");
    }

    // Get user's company
    const company = await ctx.db
      .query("companies")
      .withIndex("by_eaOrgId", (q) => q.eq("eaOrgId", eaOrgId))
      .first();

    if (!company) {
      throw new Error("Company not found. Please complete onboarding first.");
    }

    // Check slug uniqueness within company
    const existing = await ctx.db
      .query("sites")
      .withIndex("by_slug", (q) =>
        q.eq("companyId", company._id).eq("slug", slug.toLowerCase()),
      )
      .first();

    if (existing) {
      throw new Error(
        `A site with the URL "${slug}" already exists. Please choose a different name or URL slug.`
      );
    }

    const now = Date.now();
    const siteId = await ctx.db.insert("sites", {
      companyId: company._id,
      name,
      slug: slug.toLowerCase(),
      isPublished: false,
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
      settings: {
        headerType: "text",
        navigationStyle: "sidebar",
      },
    });

    // Create a default home page
    const homePageId = await ctx.db.insert("pages", {
      siteId,
      title: "Home",
      slug: "home",
      order: 0,
      isPublished: true,
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Set the home page as the default
    await ctx.db.patch(siteId, { defaultPageId: homePageId });

    return siteId;
  },
});

// Update site
export const update = mutation({
  args: {
    siteId: v.id("sites"),
    name: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    settings: v.optional(
      v.object({
        favicon: v.optional(v.string()),
        ogImage: v.optional(v.string()),
        headerType: v.optional(v.union(v.literal("logo"), v.literal("text"))),
        navigationStyle: v.optional(
          v.union(
            v.literal("sidebar"),
            v.literal("topnav"),
            v.literal("subnav")
          ),
        ),
        // Header visibility settings
        showHeader: v.optional(v.boolean()),
        showLogo: v.optional(v.boolean()),
        showSiteName: v.optional(v.boolean()),
        showHeaderSearch: v.optional(v.boolean()),
        // Site customization
        customization: v.optional(v.object({
          accentColor: v.optional(v.string()),
          accentColorDark: v.optional(v.string()),
          headerColor: v.optional(v.string()),
          headerColorDark: v.optional(v.string()),
          secondaryColor: v.optional(v.string()),
          secondaryColorDark: v.optional(v.string()),
          showHeaderGradient: v.optional(v.boolean()),
          borderRadius: v.optional(v.union(
            v.literal("none"),
            v.literal("small"),
            v.literal("medium"),
            v.literal("large"),
            v.literal("full"),
          )),
        })),
      }),
    ),
  },
  handler: async (ctx, { siteId, name, logoUrl, settings }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    // Require admin access for write operations
    await requireAdminOrLegacy(ctx, site.companyId);

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (name !== undefined) updates.name = name;
    if (logoUrl !== undefined) updates.logoUrl = logoUrl;
    if (settings !== undefined) {
      updates.settings = { ...site.settings, ...settings };
    }

    await ctx.db.patch(siteId, updates);
    return siteId;
  },
});

// Publish site
export const publish = mutation({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    // Require admin access for write operations
    await requireAdminOrLegacy(ctx, site.companyId);

    await ctx.db.patch(siteId, {
      isPublished: true,
      publishedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return siteId;
  },
});

// Unpublish site
export const unpublish = mutation({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    // Require admin access for write operations
    await requireAdminOrLegacy(ctx, site.companyId);

    await ctx.db.patch(siteId, {
      isPublished: false,
      updatedAt: Date.now(),
    });

    return siteId;
  },
});

// Set default page for the site
export const setDefaultPage = mutation({
  args: {
    siteId: v.id("sites"),
    pageId: v.id("pages"),
  },
  handler: async (ctx, { siteId, pageId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    // Require admin access for write operations
    await requireAdminOrLegacy(ctx, site.companyId);

    // Verify the page belongs to this site
    const page = await ctx.db.get(pageId);
    if (!page || page.siteId !== siteId) {
      throw new Error("Page not found or does not belong to this site");
    }

    await ctx.db.patch(siteId, {
      defaultPageId: pageId,
      updatedAt: Date.now(),
    });

    return siteId;
  },
});

// Mark content as modified (for deploy tracking)
export const markContentModified = mutation({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    // Require admin access for write operations
    await requireAdminOrLegacy(ctx, site.companyId);

    // Only update if not already marked
    if (!site.hasUndeployedChanges) {
      await ctx.db.patch(siteId, {
        hasUndeployedChanges: true,
      });
    }

    return siteId;
  },
});

// Deploy site - copies draft content (slots) to published content (publishedSlots)
export const deploy = mutation({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    // Require admin access for write operations
    await requireAdminOrLegacy(ctx, site.companyId);

    // Get all pages for this site
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    // For each page, get all layouts and copy slots → publishedSlots
    for (const page of pages) {
      const layouts = await ctx.db
        .query("layouts")
        .withIndex("by_page", (q) => q.eq("pageId", page._id))
        .collect();

      for (const layout of layouts) {
        await ctx.db.patch(layout._id, {
          publishedSlots: layout.slots,
        });
      }
    }

    // Clear the undeployed changes flag
    await ctx.db.patch(siteId, {
      hasUndeployedChanges: false,
      updatedAt: Date.now(),
    });

    return siteId;
  },
});

// Delete site
export const remove = mutation({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    // Require admin access for write operations
    await requireAdminOrLegacy(ctx, site.companyId);

    // Delete all pages and their blocks/layouts
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    for (const page of pages) {
      // Delete all blocks in page
      const blocks = await ctx.db
        .query("blocks")
        .withIndex("by_page", (q) => q.eq("pageId", page._id))
        .collect();

      for (const block of blocks) {
        await ctx.db.delete(block._id);
      }

      // Delete all layouts in page
      const layouts = await ctx.db
        .query("layouts")
        .withIndex("by_page", (q) => q.eq("pageId", page._id))
        .collect();

      for (const layout of layouts) {
        await ctx.db.delete(layout._id);
      }

      await ctx.db.delete(page._id);
    }

    // Delete all document libraries and their contents
    const libraries = await ctx.db
      .query("documentLibraries")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    for (const library of libraries) {
      // Delete all folders in library
      const folders = await ctx.db
        .query("documentFolders")
        .withIndex("by_library", (q) => q.eq("libraryId", library._id))
        .collect();
      for (const folder of folders) {
        await ctx.db.delete(folder._id);
      }

      // Delete all documents in library
      const docs = await ctx.db
        .query("documents")
        .withIndex("by_library", (q) => q.eq("libraryId", library._id))
        .collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }

      await ctx.db.delete(library._id);
    }

    // Delete site
    await ctx.db.delete(siteId);

    return { success: true };
  },
});
