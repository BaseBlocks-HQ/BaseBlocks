import { v } from "convex/values";
import { normalizeBrandColor } from "@baseblocks/domain/site-theme";
import type { Doc } from "./_generated/dataModel";
import { query, mutation } from "./_generated/server";
import {
  requireOrganizationPermission,
  isOrganizationMember,
} from "./permissions";
import { deleteDocumentRows } from "./documents";
import { createDefaultPageStructure } from "./pageStructure";
import {
  getAuthOrganizationById,
  getAuthOrganizationBySlug,
} from "./authComponent/model";
import { siteThemeSettings } from "./validators/sites";

export const listByTeam = query({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) => {
    const isMember = await isOrganizationMember(ctx, organizationId);
    if (!isMember) return [];

    const organization = await getAuthOrganizationById(ctx, organizationId);
    if (!organization?.slug) return [];
    const organizationSlug = organization.slug;

    const sites = await ctx.db
      .query("sites")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId),
      )
      .collect();

    return sites.map((site) => ({
      ...site,
      team: {
        _id: organization._id,
        name: organization.name,
        slug: organizationSlug,
      },
    }));
  },
});

// Get site by ID (authenticated — editor/dashboard only)
export const get = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return null;

    const isMember = await isOrganizationMember(ctx, site.organizationId);
    if (!isMember) return null;

    return site;
  },
});

// Get site by team slug and site slug (for public viewing)
// Returns published field projections for public consumption
export const getBySlug = query({
  args: {
    teamSlug: v.string(),
    siteSlug: v.optional(v.string()),
  },
  handler: async (ctx, { teamSlug, siteSlug }) => {
    const organization = await getAuthOrganizationBySlug(ctx, teamSlug);
    if (!organization) return null;

    let site: Doc<"sites"> | null = null;
    if (siteSlug) {
      site = await ctx.db
        .query("sites")
        .withIndex("by_organization_slug", (q) =>
          q.eq("organizationId", organization._id).eq("slug", siteSlug),
        )
        .first();
    } else {
      const sites = await ctx.db
        .query("sites")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organization._id),
        )
        .collect();
      site = sites.find((candidate) => candidate.isPublished) ?? null;
    }

    if (!site?.isPublished) return null;

    return {
      _id: site._id,
      _creationTime: site._creationTime,
      organizationId: site.organizationId,
      slug: site.slug,
      isPublished: true,
      visibility: site.visibility,
      name: site.name,
      logoUrl: site.logoUrl,
      defaultPageId: site.defaultPageId,
      settings: site.settings,
      updatedAt: site.updatedAt,
    };
  },
});

// Create a new site
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    organizationId: v.string(),
  },
  handler: async (ctx, { name, slug, organizationId }) => {
    const { auth } = await requireOrganizationPermission(ctx, organizationId, {
      resource: "site",
      action: "manage",
    });

    const organization = await getAuthOrganizationById(ctx, organizationId);
    if (!organization) throw new Error("Organization not found");

    // Check slug uniqueness within team
    const existing = await ctx.db
      .query("sites")
      .withIndex("by_organization_slug", (q) =>
        q.eq("organizationId", organization._id).eq("slug", slug.toLowerCase()),
      )
      .first();

    if (existing) {
      throw new Error(
        `A site with the URL "${slug}" already exists. Please choose a different name or URL slug.`,
      );
    }

    const now = Date.now();
    const siteId = await ctx.db.insert("sites", {
      organizationId,
      name,
      slug: slug.toLowerCase(),
      isPublished: false,
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
      settings: {},
    });

    // Create a default home page
    const homePageId = await ctx.db.insert("pages", {
      siteId,
      title: "Home",
      slug: "home",
      order: 0,
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });
    await createDefaultPageStructure(ctx, {
      siteId,
      pageId: homePageId,
      now,
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
    logoFileId: v.optional(v.id("files")),
    clearLogo: v.optional(v.boolean()),
    clearFavicon: v.optional(v.boolean()),
    settings: v.optional(
      v.object({
        favicon: v.optional(v.string()),
        showLogo: v.optional(v.boolean()),
        showSiteName: v.optional(v.boolean()),
        showHeaderSearch: v.optional(v.boolean()),
        theme: v.optional(siteThemeSettings),
      }),
    ),
  },
  handler: async (
    ctx,
    { siteId, name, logoFileId, clearLogo, clearFavicon, settings },
  ) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "site",
      action: "manage",
    });

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (name !== undefined) updates.name = name;

    if (clearLogo && logoFileId !== undefined) {
      throw new Error("Cannot replace and remove a site logo simultaneously");
    }

    if (logoFileId !== undefined) {
      const logoFile = await ctx.db.get(logoFileId);
      if (
        !logoFile ||
        logoFile.siteId !== siteId ||
        logoFile.kind !== "siteAsset"
      ) {
        throw new Error("Invalid site logo asset");
      }
    }

    // Logo replacement: clean up the previous asset when a new one is uploaded
    if (
      logoFileId !== undefined &&
      site.logoFileId &&
      site.logoFileId !== logoFileId
    ) {
      await ctx.db.delete(site.logoFileId);
    }

    if (logoFileId !== undefined) {
      updates.logoFileId = logoFileId;
      // Derive the display URL from the asset ID so they're always in sync
      updates.logoUrl = `/api/files/${logoFileId}?kind=asset`;
    }

    // Logo removal: clean up the existing asset
    if (clearLogo) {
      if (site.logoFileId) await ctx.db.delete(site.logoFileId);
      updates.logoFileId = undefined;
      updates.logoUrl = undefined;
    }

    if (settings !== undefined || clearFavicon) {
      let normalizedSettings = settings;
      if (settings?.theme?.brandColor) {
        const brandColor = normalizeBrandColor(settings.theme.brandColor);
        if (!brandColor) throw new Error("Invalid custom brand color");
        normalizedSettings = {
          ...settings,
          theme: { ...settings.theme, brandColor },
        };
      }
      const nextSettings = { ...site.settings, ...normalizedSettings };
      if (clearFavicon) delete nextSettings.favicon;
      updates.settings = nextSettings;
    }

    await ctx.db.patch(siteId, updates);

    return siteId;
  },
});

// Publish site (auto-deploys on first publish)
export const publish = mutation({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    const now = Date.now();
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "publication",
      action: "publish",
    });
    await ctx.db.patch(siteId, {
      isPublished: true,
      publishedAt: site.publishedAt ?? now,
      updatedAt: now,
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
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "publication",
      action: "publish",
    });

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
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "site",
      action: "manage",
    });

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

// Delete site and all related data
export const remove = mutation({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "site",
      action: "manage",
    });
    const attachedDomains = await ctx.db
      .query("siteDomains")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
    if (attachedDomains.length > 0) {
      throw new Error("Remove this site's custom domains before deleting it");
    }

    // 1. Delete all document libraries and their contents
    //    (documents first so assets + S3 objects are properly cleaned up)
    const libraries = await ctx.db
      .query("documentLibraries")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    for (const library of libraries) {
      const docs = await ctx.db
        .query("documents")
        .withIndex("by_folder", (q) => q.eq("libraryId", library._id))
        .collect();
      for (const doc of docs) {
        await deleteDocumentRows(ctx, doc);
      }

      const folders = await ctx.db
        .query("documentFolders")
        .withIndex("by_parent", (q) => q.eq("libraryId", library._id))
        .collect();
      for (const folder of folders) {
        await ctx.db.delete(folder._id);
      }

      await ctx.db.delete(library._id);
    }

    // 2. Delete site-level documents (not in any library)
    const siteDocs = await ctx.db
      .query("documents")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
    for (const doc of siteDocs) {
      // deleteDocumentRows is idempotent-safe; already-deleted ones are filtered by DB
      if (doc.libraryId) continue; // already handled above
      await deleteDocumentRows(ctx, doc);
    }

    // 3. Delete all site assets (logos, favicons, editor media)
    //    and schedule their S3 object deletions
    const siteAssets = await ctx.db
      .query("files")
      .withIndex("by_site_kind", (q) =>
        q.eq("siteId", siteId).eq("kind", "siteAsset"),
      )
      .collect();
    for (const asset of siteAssets) {
      await ctx.db.delete(asset._id);
    }

    // 4. Delete all canonical search entries for the site.
    const searchEntries = await ctx.db
      .query("searchEntries")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
    for (const entry of searchEntries) {
      await ctx.db.delete(entry._id);
    }

    // 5. Delete all page content and pages
    const openEditorPageContents = await ctx.db
      .query("openEditorPageContents")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
    await Promise.all(
      openEditorPageContents.map((content) =>
        ctx.db.delete("openEditorPageContents", content._id),
      ),
    );
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
    for (const page of pages) {
      await ctx.db.delete(page._id);
    }

    // 6. Delete access codes and sessions
    const accessCodes = await ctx.db
      .query("siteAccessCodes")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
    for (const code of accessCodes) {
      await ctx.db.delete(code._id);
    }

    const accessSessions = await ctx.db
      .query("siteAccessSessions")
      .withIndex("by_site_token", (q) => q.eq("siteId", siteId))
      .collect();
    for (const session of accessSessions) {
      await ctx.db.delete(session._id);
    }

    // 7. Delete the site itself
    await ctx.db.delete(siteId);

    return { success: true };
  },
});
