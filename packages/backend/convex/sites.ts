import { v } from "convex/values";
import { normalizeBrandColor } from "@baseblocks/domain/site-theme";
import { query, mutation } from "./_generated/server";
import {
  requireOrganizationPermission,
  isOrganizationMember,
} from "./permissions";
import { deleteFileRows } from "./files";
import { getAuthOrganizationById } from "./authComponent/model";
import { siteSidebarVariant, siteThemeSettings } from "./validators/sites";

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
      visibility: "private",
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
      settings: {},
    });

    const homePageId = await ctx.db.insert("pages", {
      siteId,
      title: "Home",
      slug: "home",
      order: 0,
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(siteId, { defaultPageId: homePageId });

    return siteId;
  },
});

export const update = mutation({
  args: {
    siteId: v.id("sites"),
    name: v.optional(v.string()),
    logoFileId: v.optional(v.id("files")),
    clearLogo: v.optional(v.boolean()),
    clearFavicon: v.optional(v.boolean()),
    settings: v.optional(
      v.object({
        expandNavigationByDefault: v.optional(v.boolean()),
        favicon: v.optional(v.string()),
        sidebarVariant: v.optional(siteSidebarVariant),
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

    if (
      logoFileId !== undefined &&
      site.logoFileId &&
      site.logoFileId !== logoFileId
    ) {
      await ctx.db.delete(site.logoFileId);
    }

    if (logoFileId !== undefined) {
      updates.logoFileId = logoFileId;
      updates.logoUrl = `/api/files/${logoFileId}`;
    }

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

export const setPublished = mutation({
  args: { siteId: v.id("sites"), published: v.boolean() },
  handler: async (ctx, { siteId, published }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "publication",
      action: "publish",
    });

    const now = Date.now();
    await ctx.db.patch(siteId, {
      isPublished: published,
      publishedAt: published ? (site.publishedAt ?? now) : site.publishedAt,
      updatedAt: now,
    });

    return siteId;
  },
});

export const setDefaultPage = mutation({
  args: {
    siteId: v.id("sites"),
    pageId: v.id("pages"),
  },
  handler: async (ctx, { siteId, pageId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "site",
      action: "manage",
    });

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

    const libraries = await ctx.db
      .query("documentLibraries")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    for (const library of libraries) {
      const folders = await ctx.db
        .query("documentFolders")
        .withIndex("by_parent", (q) => q.eq("libraryId", library._id))
        .collect();
      for (const folder of folders) {
        await ctx.db.delete(folder._id);
      }

      await ctx.db.delete(library._id);
    }

    const files = await ctx.db
      .query("files")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
    for (const file of files) {
      await deleteFileRows(ctx, file);
    }

    const searchEntries = await ctx.db
      .query("searchEntries")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
    for (const entry of searchEntries) {
      await ctx.db.delete(entry._id);
    }

    const pageContents = await ctx.db
      .query("pageContents")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
    await Promise.all(
      pageContents.map((content) => ctx.db.delete("pageContents", content._id)),
    );
    const pageReferences = await ctx.db
      .query("pageReferences")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
    for (const reference of pageReferences) {
      await ctx.db.delete(reference._id);
    }
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
    for (const page of pages) {
      await ctx.db.delete(page._id);
    }

    await ctx.db.delete(siteId);

    return { success: true };
  },
});
