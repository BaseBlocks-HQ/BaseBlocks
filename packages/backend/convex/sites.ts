// Flattened Convex domain module. Keep this file as the public API for this domain.
import { v } from "convex/values";
import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import { query, mutation } from "./_generated/server";
import {
  requirePublisher,
  requireSiteManager,
  checkIsMember,
} from "./permissions";
import { deleteDocumentRows } from "./documents";
import { deleteObjectAction } from "./files";
import { getAccessiblePublishedPages } from "./sharing";
import { createDefaultPageStructure } from "./pageStructure";

/** Site customization theme options */
export const siteCustomization = v.object({
  accentColor: v.optional(v.string()),
  accentColorDark: v.optional(v.string()),
  headerColor: v.optional(v.string()),
  headerColorDark: v.optional(v.string()),
  secondaryColor: v.optional(v.string()),
  secondaryColorDark: v.optional(v.string()),
  tertiaryColor: v.optional(v.string()),
  tertiaryColorDark: v.optional(v.string()),
  showHeaderGradient: v.optional(v.boolean()),
  borderRadius: v.optional(
    v.union(
      v.literal("none"),
      v.literal("small"),
      v.literal("medium"),
      v.literal("large"),
      v.literal("full"),
    ),
  ),
});

/** Site settings (navigation, header, SEO, customization) */
export const siteSettings = v.object({
  favicon: v.optional(v.string()),
  ogImage: v.optional(v.string()),
  siteTitle: v.optional(v.string()),
  siteDescription: v.optional(v.string()),
  siteKeywords: v.optional(v.string()),
  headerType: v.union(v.literal("logo"), v.literal("text")),
  navigationStyle: v.union(
    v.literal("sidebar"),
    v.literal("topnav"),
    v.literal("subnav"),
  ),
  showHeader: v.optional(v.boolean()),
  showLogo: v.optional(v.boolean()),
  showSiteName: v.optional(v.boolean()),
  showHeaderSearch: v.optional(v.boolean()),
  showBreadcrumbs: v.optional(v.boolean()),
  sidebarDefaultExpanded: v.optional(v.boolean()),
  customization: v.optional(siteCustomization),
});

/**
 * Database context type — works for both queries and mutations.
 * Replaces the unsafe `ctx: { db: any }` pattern used previously.
 */
type DbCtx = Pick<
  GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>,
  "db"
>;

/**
 * Resolved page info with properly typed IDs.
 */
export type PageInfo = {
  teamId: Id<"teams">;
  siteId: Id<"sites">;
};

/**
 * Resolve a page's team and site IDs.
 * Returns null if page or site doesn't exist.
 */
export async function resolvePageContext(
  ctx: DbCtx,
  pageId: Id<"pages">,
): Promise<PageInfo | null> {
  const page = await ctx.db.get(pageId);
  if (!page) return null;

  const site = await ctx.db.get(page.siteId);
  if (!site) return null;

  return { teamId: site.teamId, siteId: site._id };
}

/**
 * Resolve a site's team ID.
 * Returns null if site doesn't exist.
 */
export async function resolveSiteContext(
  ctx: DbCtx,
  siteId: Id<"sites">,
): Promise<{ teamId: Id<"teams"> } | null> {
  const site = await ctx.db.get(siteId);
  if (!site) return null;

  return { teamId: site.teamId };
}

/**
 * Collect library IDs that are actively used in published blocks across a site.
 * Blocks are first-class documents, so this does not scan nested page trees.
 */
export async function getActiveLibraryIds(
  ctx: DbCtx,
  siteId: Id<"sites">,
): Promise<Set<string>> {
  return getActiveLibraryIdsForPageIds(ctx, siteId);
}

export async function getActiveLibraryIdsForPageIds(
  ctx: DbCtx,
  siteId: Id<"sites">,
  pageIds?: Iterable<string>,
): Promise<Set<string>> {
  const blocks = await ctx.db
    .query("blocks")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .collect();

  const allowedPageIds = pageIds ? new Set(pageIds) : null;
  const activeLibraryIds = new Set<string>();
  for (const block of blocks) {
    if (allowedPageIds && !allowedPageIds.has(block.pageId)) {
      continue;
    }
    if (block.type === "library" && block.content?.libraryId) {
      activeLibraryIds.add(block.content.libraryId);
    }
  }

  return activeLibraryIds;
}

export const listByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, { teamId }) => {
    const isMember = await checkIsMember(ctx, teamId);
    if (!isMember) return [];

    const team = await ctx.db.get(teamId);
    if (!team) return [];

    const sites = await ctx.db
      .query("sites")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .collect();

    return sites.map((site) => ({
      ...site,
      team: {
        _id: team._id,
        name: team.name,
        slug: team.slug,
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

    const isMember = await checkIsMember(ctx, site.teamId);
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
    // Find team
    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", teamSlug))
      .first();

    if (!team) return null;

    let site: Doc<"sites"> | null = null;
    if (siteSlug) {
      site = await ctx.db
        .query("sites")
        .withIndex("by_slug", (q) =>
          q.eq("teamId", team._id).eq("slug", siteSlug),
        )
        .first();
    } else {
      const sites = await ctx.db
        .query("sites")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .collect();
      site = sites.find((candidate) => candidate.isPublished) ?? null;
    }

    if (!site?.isPublished) return null;

    return {
      _id: site._id,
      _creationTime: site._creationTime,
      teamId: site.teamId,
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

// Get site with default page info (for public viewing)
// Returns published field projections for public consumption
export const getWithDefaultPage = query({
  args: {
    teamSlug: v.string(),
    siteSlug: v.optional(v.string()),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { teamSlug, siteSlug, sessionTokens }) => {
    // Find team
    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", teamSlug))
      .first();

    if (!team) return null;

    let site: Doc<"sites"> | null = null;
    if (siteSlug) {
      site = await ctx.db
        .query("sites")
        .withIndex("by_slug", (q) =>
          q.eq("teamId", team._id).eq("slug", siteSlug),
        )
        .first();
    } else {
      const sites = await ctx.db
        .query("sites")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .collect();
      site = sites.find((candidate) => candidate.isPublished) ?? null;
    }

    if (!site?.isPublished) return null;

    const accessiblePages = await getAccessiblePublishedPages(
      ctx,
      site,
      sessionTokens,
    );
    const publishedDefaultPageId = site.defaultPageId;

    let defaultPage =
      accessiblePages.find((page) => page._id === publishedDefaultPageId) ??
      null;

    if (!defaultPage) {
      const rootPages = accessiblePages
        .filter((page) => !page.parentId)
        .sort((a, b) => a.order - b.order);
      defaultPage = rootPages[0] ?? null;
    }

    const publishedSite = {
      _id: site._id,
      _creationTime: site._creationTime,
      teamId: site.teamId,
      slug: site.slug,
      isPublished: true,
      visibility: site.visibility,
      name: site.name,
      logoUrl: site.logoUrl,
      defaultPageId: publishedDefaultPageId,
      settings: site.settings,
      updatedAt: site.updatedAt,
    };

    // Only expose public-safe team fields
    const publicTeam = {
      _id: team._id,
      name: team.name,
      slug: team.slug,
    };

    return {
      site: publishedSite,
      team: publicTeam,
      defaultPage,
    };
  },
});

// List all published, public-visibility sites with team slugs (for sitemap generation)
// No auth required — only exposes public-safe data
export const listPublishedSlugs = query({
  args: {},
  handler: async (ctx) => {
    const teams = await ctx.db.query("teams").collect();

    const results: Array<{
      teamSlug: string;
      siteSlug: string;
      updatedAt: number;
    }> = [];

    for (const team of teams) {
      const sites = await ctx.db
        .query("sites")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .collect();

      for (const site of sites) {
        if (!site.isPublished) continue;
        if (site.visibility && site.visibility !== "public") continue;

        results.push({
          teamSlug: team.slug,
          siteSlug: site.slug,
          updatedAt: site.updatedAt,
        });
      }
    }

    return results;
  },
});

// Create a new site
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    teamId: v.id("teams"),
  },
  handler: async (ctx, { name, slug, teamId }) => {
    const { auth } = await requireSiteManager(ctx, teamId);

    const team = await ctx.db.get(teamId);
    if (!team) {
      throw new Error("Team not found. Please complete onboarding first.");
    }

    // Check slug uniqueness within team
    const existing = await ctx.db
      .query("sites")
      .withIndex("by_slug", (q) =>
        q.eq("teamId", team._id).eq("slug", slug.toLowerCase()),
      )
      .first();

    if (existing) {
      throw new Error(
        `A site with the URL "${slug}" already exists. Please choose a different name or URL slug.`,
      );
    }

    const now = Date.now();
    const siteId = await ctx.db.insert("sites", {
      teamId,
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
    logoUrl: v.optional(v.string()),
    logoAssetId: v.optional(v.id("assets")),
    clearLogo: v.optional(v.boolean()),
    settings: v.optional(
      v.object({
        favicon: v.optional(v.string()),
        ogImage: v.optional(v.string()),
        siteTitle: v.optional(v.string()),
        siteDescription: v.optional(v.string()),
        siteKeywords: v.optional(v.string()),
        headerType: v.optional(v.union(v.literal("logo"), v.literal("text"))),
        navigationStyle: v.optional(
          v.union(
            v.literal("sidebar"),
            v.literal("topnav"),
            v.literal("subnav"),
          ),
        ),
        // Header visibility settings
        showHeader: v.optional(v.boolean()),
        showLogo: v.optional(v.boolean()),
        showSiteName: v.optional(v.boolean()),
        showHeaderSearch: v.optional(v.boolean()),
        showBreadcrumbs: v.optional(v.boolean()),
        sidebarDefaultExpanded: v.optional(v.boolean()),
        // Site customization
        customization: v.optional(
          v.object({
            accentColor: v.optional(v.string()),
            accentColorDark: v.optional(v.string()),
            headerColor: v.optional(v.string()),
            headerColorDark: v.optional(v.string()),
            secondaryColor: v.optional(v.string()),
            secondaryColorDark: v.optional(v.string()),
            tertiaryColor: v.optional(v.string()),
            tertiaryColorDark: v.optional(v.string()),
            showHeaderGradient: v.optional(v.boolean()),
            borderRadius: v.optional(
              v.union(
                v.literal("none"),
                v.literal("small"),
                v.literal("medium"),
                v.literal("large"),
                v.literal("full"),
              ),
            ),
          }),
        ),
      }),
    ),
  },
  handler: async (
    ctx,
    { siteId, name, logoUrl, logoAssetId, clearLogo, settings },
  ) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    await requireSiteManager(ctx, site.teamId);

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (name !== undefined) updates.name = name;

    // Logo replacement: clean up the previous asset when a new one is uploaded
    if (
      logoAssetId !== undefined &&
      site.logoAssetId &&
      site.logoAssetId !== logoAssetId
    ) {
      const oldAsset = await ctx.db.get(site.logoAssetId);
      await ctx.db.delete(site.logoAssetId);
      if (oldAsset) {
        await ctx.scheduler.runAfter(0, deleteObjectAction, {
          objectKey: oldAsset.objectKey,
        });
      }
    }

    if (logoAssetId !== undefined) {
      updates.logoAssetId = logoAssetId;
      // Derive the display URL from the asset ID so they're always in sync
      updates.logoUrl = `/api/storage/assets/${logoAssetId}`;
    }

    // Logo removal: clean up the existing asset
    if (clearLogo && site.logoAssetId) {
      const oldAsset = await ctx.db.get(site.logoAssetId);
      await ctx.db.delete(site.logoAssetId);
      if (oldAsset) {
        await ctx.scheduler.runAfter(0, deleteObjectAction, {
          objectKey: oldAsset.objectKey,
        });
      }
      updates.logoAssetId = undefined;
      updates.logoUrl = undefined;
    } else if (logoUrl !== undefined && logoAssetId === undefined) {
      // Legacy path: plain URL update without an assetId (e.g. external URL)
      updates.logoUrl = logoUrl;
    }

    if (settings !== undefined) {
      updates.settings = { ...site.settings, ...settings };
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
    await requirePublisher(ctx, site.teamId);
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
    await requirePublisher(ctx, site.teamId);

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
    await requireSiteManager(ctx, site.teamId);

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

    await requireSiteManager(ctx, site.teamId);

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

    // 3. Delete all site assets (logos, favicons, og images, editor media)
    //    and schedule their S3 object deletions
    const siteAssets = await ctx.db
      .query("assets")
      .withIndex("by_site_kind", (q) =>
        q.eq("siteId", siteId).eq("kind", "siteAsset"),
      )
      .collect();
    for (const asset of siteAssets) {
      await ctx.db.delete(asset._id);
      await ctx.scheduler.runAfter(0, deleteObjectAction, {
        objectKey: asset.objectKey,
      });
    }

    // 4. Delete all searchableContent for the site (pages + any remaining docs)
    const searchEntries = await ctx.db
      .query("searchableContent")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
    for (const entry of searchEntries) {
      await ctx.db.delete(entry._id);
    }

    // 5. Delete all page content and pages
    const [blocks, columns, sections] = await Promise.all([
      ctx.db
        .query("blocks")
        .withIndex("by_site", (q) => q.eq("siteId", siteId))
        .collect(),
      ctx.db
        .query("columns")
        .withIndex("by_site", (q) => q.eq("siteId", siteId))
        .collect(),
      ctx.db
        .query("sections")
        .withIndex("by_site", (q) => q.eq("siteId", siteId))
        .collect(),
    ]);
    await Promise.all([
      ...blocks.map((block) => ctx.db.delete(block._id)),
      ...columns.map((column) => ctx.db.delete(column._id)),
      ...sections.map((section) => ctx.db.delete(section._id)),
    ]);
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
