import { v } from "convex/values";
import { normalizeBrandColor } from "@baseblocks/domain/site-theme";
import { query, mutation } from "./_generated/server";
import {
  requireOrganizationPermission,
  isOrganizationMember,
} from "./permissions";
import { getAuthOrganizationById } from "./authComponent/model";
import { siteSidebarVariant, siteThemeSettings } from "./validators/sites";
import { assertDraftWritable, touchSiteDraft } from "./model/draft";
import { deleteSiteData } from "./model/siteDeletion";
import { attachSiteAsset, reconcileSiteAsset } from "./model/siteAssets";

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

export const getAnalyticsScope = query({
  args: {
    organizationId: v.string(),
    siteId: v.id("sites"),
  },
  handler: async (ctx, { organizationId, siteId }) => {
    const isMember = await isOrganizationMember(ctx, organizationId);
    if (!isMember) return null;

    const site = await ctx.db.get(siteId);
    if (!site || site.organizationId !== organizationId) return null;

    const organization = await getAuthOrganizationById(ctx, organizationId);
    if (!organization?.slug) return null;

    const [domains, release, pages] = await Promise.all([
      ctx.db
        .query("siteDomains")
        .withIndex("by_site", (q) => q.eq("siteId", siteId))
        .collect(),
      site.liveReleaseId ? ctx.db.get(site.liveReleaseId) : null,
      site.liveReleaseId
        ? ctx.db
            .query("releasePages")
            .withIndex("by_release", (q) =>
              q.eq("releaseId", site.liveReleaseId!),
            )
            .collect()
        : [],
    ]);

    const pagePaths = pages.map((page) => {
      if (page.pageId === release?.defaultPageId) return [];

      const path = [page.slug];
      let parentId = page.parentId;
      while (parentId) {
        const parent = pages.find((candidate) => candidate.pageId === parentId);
        if (!parent) break;
        path.unshift(parent.slug);
        parentId = parent.parentId;
      }
      return path;
    });

    return {
      organizationSlug: organization.slug,
      site: {
        _id: site._id,
        name: site.name,
        slug: site.slug,
      },
      pagePaths,
      verifiedDomains: domains
        .filter((domain) => domain.status === "verified")
        .map((domain) => domain.hostname),
    };
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
      visibility: "private",
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
      settings: {},
      draftRevision: 0,
      nextReleaseNumber: 1,
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
    await touchSiteDraft(ctx, siteId, now, [
      { entityType: "site", entityId: siteId },
      { entityType: "page", entityId: homePageId },
    ]);

    return siteId;
  },
});

export const update = mutation({
  args: {
    siteId: v.id("sites"),
    name: v.optional(v.string()),
    logoFileId: v.optional(v.id("files")),
    faviconFileId: v.optional(v.id("files")),
    clearLogo: v.optional(v.boolean()),
    clearFavicon: v.optional(v.boolean()),
    settings: v.optional(
      v.object({
        expandNavigationByDefault: v.optional(v.boolean()),
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
    {
      siteId,
      name,
      logoFileId,
      faviconFileId,
      clearLogo,
      clearFavicon,
      settings,
    },
  ) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "site",
      action: "manage",
    });

    const now = Date.now();
    const updates: Record<string, unknown> = { updatedAt: now };
    if (name !== undefined) updates.name = name;

    if (clearLogo && logoFileId !== undefined) {
      throw new Error("Cannot replace and remove a site logo simultaneously");
    }
    if (clearFavicon && faviconFileId !== undefined) {
      throw new Error("Cannot replace and remove a favicon simultaneously");
    }

    if (logoFileId !== undefined) {
      await attachSiteAsset(ctx, siteId, logoFileId, now);
    }
    if (faviconFileId !== undefined) {
      await attachSiteAsset(ctx, siteId, faviconFileId, now);
    }

    if (logoFileId !== undefined) {
      updates.logoFileId = logoFileId;
    }
    if (faviconFileId !== undefined) updates.faviconFileId = faviconFileId;

    if (clearLogo) {
      updates.logoFileId = undefined;
    }
    if (clearFavicon) updates.faviconFileId = undefined;

    if (settings !== undefined) {
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
      updates.settings = nextSettings;
    }

    await ctx.db.patch(siteId, updates);
    for (const previousFileId of [site.logoFileId, site.faviconFileId]) {
      if (
        previousFileId &&
        previousFileId !== logoFileId &&
        previousFileId !== faviconFileId
      ) {
        await reconcileSiteAsset(ctx, previousFileId, { now });
      }
    }
    await touchSiteDraft(ctx, siteId, Date.now(), [
      { entityType: "site", entityId: siteId },
      ...(site.logoFileId &&
      (clearLogo ||
        (logoFileId !== undefined && site.logoFileId !== logoFileId))
        ? [{ entityType: "file" as const, entityId: site.logoFileId }]
        : []),
      ...(site.faviconFileId &&
      (clearFavicon ||
        (faviconFileId !== undefined && site.faviconFileId !== faviconFileId))
        ? [{ entityType: "file" as const, entityId: site.faviconFileId }]
        : []),
    ]);

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
    await touchSiteDraft(ctx, siteId);

    return siteId;
  },
});

export const remove = mutation({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");
    assertDraftWritable(site);

    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "site",
      action: "manage",
    });
    await deleteSiteData(ctx, siteId, { includeDomains: false });

    return { success: true };
  },
});
