import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { getAuthContext, requireAdmin } from "../auth";
import { markSiteModified } from "../lib/markModified";
import { deleteObjectAction } from "../storage/actions";
import { deleteDocumentRows } from "../documents/lib";

// Create a new site
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, { name, slug, teamId: explicitTeamId }) => {
    const auth = await getAuthContext(ctx);

    let resolvedTeamId: Id<"teams">;

    if (explicitTeamId) {
      await requireAdmin(ctx, explicitTeamId);
      resolvedTeamId = explicitTeamId;
    } else {
      const membership = await ctx.db
        .query("members")
        .withIndex("by_user", (q) => q.eq("userId", auth.userId))
        .first();

      if (!membership) {
        throw new Error("Team not found. Please complete onboarding first.");
      }

      await requireAdmin(ctx, membership.teamId);
      resolvedTeamId = membership.teamId;
    }

    const team = await ctx.db.get(resolvedTeamId);
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
      teamId: team._id,
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
  handler: async (ctx, { siteId, name, logoUrl, logoAssetId, clearLogo, settings }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    await requireAdmin(ctx, site.teamId);

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (name !== undefined) updates.name = name;

    // Logo replacement: clean up the previous asset when a new one is uploaded
    if (logoAssetId !== undefined && site.logoAssetId && site.logoAssetId !== logoAssetId) {
      const oldAsset = await ctx.db.get(site.logoAssetId);
      await ctx.db.delete(site.logoAssetId);
      if (oldAsset) {
        await ctx.scheduler.runAfter(0, deleteObjectAction, {
          bucket: oldAsset.bucket,
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
          bucket: oldAsset.bucket,
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
    await markSiteModified(ctx, siteId);

    return siteId;
  },
});

// Publish site (auto-deploys on first publish)
export const publish = mutation({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    const { auth } = await requireAdmin(ctx, site.teamId);
    const now = Date.now();

    await ctx.db.patch(siteId, {
      isPublished: true,
      publishedAt: now,
      updatedAt: now,
    });

    // Auto-deploy on first publish (if never deployed before)
    if (!site.lastDeployedAt) {
      const pages = await ctx.db
        .query("pages")
        .withIndex("by_site", (q) => q.eq("siteId", siteId))
        .collect();

      const newVersion = 1;

      // Create deployment record
      const deploymentId = await ctx.db.insert("deployments", {
        siteId,
        version: newVersion,
        deployedBy: auth.userId,
        deployedAt: now,
        notes: "Initial publish",
        summary: {
          pagesDeployed: pages.length,
          layoutsDeployed: 0,
          settingsChanged: true,
        },
        status: "active",
      });

      // Copy draft -> published for site
      await ctx.db.patch(siteId, {
        publishedName: site.name,
        publishedLogoUrl: site.logoUrl,
        publishedDefaultPageId: site.defaultPageId,
        publishedSettings: site.settings,
        lastDeployedAt: now,
        lastDeployedBy: auth.userId,
        deploymentVersion: newVersion,
      });

      // Snapshot and copy for pages + layouts
      let totalLayouts = 0;

      await ctx.db.insert("deploymentSnapshots", {
        deploymentId,
        siteId,
        chunkType: "site-settings",
        data: {
          name: site.name,
          logoUrl: site.logoUrl,
          defaultPageId: site.defaultPageId,
          settings: site.settings,
        },
      });

      const pageTreeData = pages.map((p) => ({
        _id: p._id,
        title: p.title,
        slug: p.slug,
        icon: p.icon,
        order: p.order,
        parentId: p.parentId,
        pageTabs: p.pageTabs,
      }));

      await ctx.db.insert("deploymentSnapshots", {
        deploymentId,
        siteId,
        chunkType: "page-tree",
        data: pageTreeData,
      });

      for (const page of pages) {
        await ctx.db.patch(page._id, {
          publishedTitle: page.title,
          publishedSlug: page.slug,
          publishedIcon: page.icon,
          publishedOrder: page.order,
          publishedParentId: page.parentId,
          publishedPageTabs: page.pageTabs,
          isDeployed: true,
        });

        const layouts = await ctx.db
          .query("layouts")
          .withIndex("by_page", (q) => q.eq("pageId", page._id))
          .collect();

        await ctx.db.insert("deploymentSnapshots", {
          deploymentId,
          siteId,
          chunkType: "page-layouts",
          pageId: page._id,
          data: layouts.map((l) => ({
            _id: l._id,
            type: l.type,
            order: l.order,
            tabId: l.tabId,
            slots: l.slots,
            settings: l.settings,
          })),
        });

        for (const layout of layouts) {
          await ctx.db.patch(layout._id, {
            publishedSlots: layout.slots,
            publishedType: layout.type,
            publishedOrder: layout.order,
            publishedSettings: layout.settings,
            publishedTabId: layout.tabId,
            isDeployed: true,
          });
          totalLayouts++;
        }
      }

      await ctx.db.patch(deploymentId, {
        summary: {
          pagesDeployed: pages.length,
          layoutsDeployed: totalLayouts,
          settingsChanged: true,
        },
      });
    }

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
    await requireAdmin(ctx, site.teamId);

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
    await requireAdmin(ctx, site.teamId);

    // Verify the page belongs to this site
    const page = await ctx.db.get(pageId);
    if (!page || page.siteId !== siteId) {
      throw new Error("Page not found or does not belong to this site");
    }

    await ctx.db.patch(siteId, {
      defaultPageId: pageId,
      updatedAt: Date.now(),
    });
    await markSiteModified(ctx, siteId);

    return siteId;
  },
});

// Delete site and all related data
export const remove = mutation({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    await requireAdmin(ctx, site.teamId);

    // 1. Delete all document libraries and their contents
    //    (documents first so assets + S3 objects are properly cleaned up)
    const libraries = await ctx.db
      .query("documentLibraries")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    for (const library of libraries) {
      const docs = await ctx.db
        .query("documents")
        .withIndex("by_library", (q) => q.eq("libraryId", library._id))
        .collect();
      for (const doc of docs) {
        await deleteDocumentRows(ctx, doc);
      }

      const folders = await ctx.db
        .query("documentFolders")
        .withIndex("by_library", (q) => q.eq("libraryId", library._id))
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
        bucket: asset.bucket,
        objectKey: asset.objectKey,
      });
    }

    // 4. Delete all searchableContent for the site (subpages + any remaining docs)
    const searchEntries = await ctx.db
      .query("searchableContent")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
    for (const entry of searchEntries) {
      await ctx.db.delete(entry._id);
    }

    // 5. Delete all pages and their layouts
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
    for (const page of pages) {
      const layouts = await ctx.db
        .query("layouts")
        .withIndex("by_page", (q) => q.eq("pageId", page._id))
        .collect();
      for (const layout of layouts) {
        await ctx.db.delete(layout._id);
      }
      await ctx.db.delete(page._id);
    }

    // 6. Delete deployment history (snapshots before deployments, FK order)
    const deployments = await ctx.db
      .query("deployments")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
    for (const deployment of deployments) {
      const snapshots = await ctx.db
        .query("deploymentSnapshots")
        .withIndex("by_deployment", (q) => q.eq("deploymentId", deployment._id))
        .collect();
      for (const snapshot of snapshots) {
        await ctx.db.delete(snapshot._id);
      }
      await ctx.db.delete(deployment._id);
    }

    // 7. Delete access codes and sessions
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

    // 8. Delete the site itself
    await ctx.db.delete(siteId);

    return { success: true };
  },
});
