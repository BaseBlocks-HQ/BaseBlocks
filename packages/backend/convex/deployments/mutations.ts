import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { requireAdmin } from "../auth";

/**
 * Deploy site - copies ALL draft fields to published fields for sites, pages, and layouts.
 * Creates deployment record with snapshot for rollback.
 */
export const deploy = mutation({
  args: {
    siteId: v.id("sites"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { siteId, notes }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    const { auth } = await requireAdmin(ctx, site.teamId);
    const now = Date.now();

    // Mark current active deployment as superseded
    const activeDeployment = await ctx.db
      .query("deployments")
      .withIndex("by_site_status", (q) =>
        q.eq("siteId", siteId).eq("status", "active"),
      )
      .first();

    if (activeDeployment) {
      await ctx.db.patch(activeDeployment._id, { status: "superseded" });
    }

    // Collect all pages and layouts
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    let totalLayouts = 0;

    // Calculate new version number
    const newVersion = (site.deploymentVersion ?? 0) + 1;

    // Create deployment record
    const deploymentId = await ctx.db.insert("deployments", {
      siteId,
      version: newVersion,
      deployedBy: auth.userId,
      deployedAt: now,
      notes,
      summary: {
        pagesDeployed: pages.length,
        layoutsDeployed: 0, // updated below
        settingsChanged: true,
      },
      status: "active",
    });

    // Create site-settings snapshot
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

    // Create page-tree snapshot
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

    // Copy draft → published for site
    await ctx.db.patch(siteId, {
      publishedName: site.name,
      publishedLogoUrl: site.logoUrl,
      publishedDefaultPageId: site.defaultPageId,
      publishedSettings: site.settings,
      lastDeployedAt: now,
      lastDeployedBy: auth.userId,
      deploymentVersion: newVersion,
    });

    // Copy draft → published for each page and its layouts
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

      // Snapshot layouts for this page
      const layoutData = layouts.map((l) => ({
        _id: l._id,
        type: l.type,
        order: l.order,
        tabId: l.tabId,
        slots: l.slots,
        settings: l.settings,
      }));

      // Stringify layout data to avoid Convex 16-level nesting limit
      // (BlockNote content within subpage blocks can be deeply nested)
      await ctx.db.insert("deploymentSnapshots", {
        deploymentId,
        siteId,
        chunkType: "page-layouts",
        pageId: page._id,
        data: JSON.stringify(layoutData),
      });

      // Copy draft → published for each layout
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

    // Update deployment summary with actual layout count
    await ctx.db.patch(deploymentId, {
      summary: {
        pagesDeployed: pages.length,
        layoutsDeployed: totalLayouts,
        settingsChanged: true,
      },
    });

    return deploymentId;
  },
});

/**
 * Rollback to a previous deployment - restores published fields from snapshot.
 * Creates a new deployment record so the rollback itself is in history.
 */
export const rollback = mutation({
  args: {
    siteId: v.id("sites"),
    targetDeploymentId: v.id("deployments"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { siteId, targetDeploymentId, notes }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    const { auth } = await requireAdmin(ctx, site.teamId);

    // Verify target deployment belongs to this site
    const targetDeployment = await ctx.db.get(targetDeploymentId);
    if (!targetDeployment || targetDeployment.siteId !== siteId) {
      throw new Error("Deployment not found");
    }

    const now = Date.now();

    // Mark current active deployment as rolled-back
    const activeDeployment = await ctx.db
      .query("deployments")
      .withIndex("by_site_status", (q) =>
        q.eq("siteId", siteId).eq("status", "active"),
      )
      .first();

    if (activeDeployment) {
      await ctx.db.patch(activeDeployment._id, { status: "rolled-back" });
    }

    // Load snapshots for target deployment
    const snapshots = await ctx.db
      .query("deploymentSnapshots")
      .withIndex("by_deployment", (q) =>
        q.eq("deploymentId", targetDeploymentId),
      )
      .collect();

    const siteSettingsSnapshot = snapshots.find(
      (s) => s.chunkType === "site-settings",
    );
    const pageTreeSnapshot = snapshots.find((s) => s.chunkType === "page-tree");
    const pageLayoutSnapshots = snapshots.filter(
      (s) => s.chunkType === "page-layouts",
    );

    if (!siteSettingsSnapshot || !pageTreeSnapshot) {
      throw new Error("Incomplete deployment snapshot");
    }

    // Calculate new version
    const newVersion = (site.deploymentVersion ?? 0) + 1;

    // Create new deployment record for the rollback
    const rollbackDeploymentId = await ctx.db.insert("deployments", {
      siteId,
      version: newVersion,
      deployedBy: auth.userId,
      deployedAt: now,
      notes: notes || `Rollback to v${targetDeployment.version}`,
      summary: targetDeployment.summary,
      status: "active",
    });

    // Copy snapshots to the new deployment (for future rollback-of-rollback)
    for (const snapshot of snapshots) {
      // Ensure page-layouts data is stringified to avoid nesting limit
      const data =
        snapshot.chunkType === "page-layouts" &&
        typeof snapshot.data !== "string"
          ? JSON.stringify(snapshot.data)
          : snapshot.data;
      await ctx.db.insert("deploymentSnapshots", {
        deploymentId: rollbackDeploymentId,
        siteId: snapshot.siteId,
        chunkType: snapshot.chunkType,
        pageId: snapshot.pageId,
        data,
      });
    }

    // Restore site settings from snapshot
    const siteData = siteSettingsSnapshot.data as {
      name: string;
      logoUrl?: string;
      defaultPageId?: Id<"pages">;
      settings: any;
    };

    await ctx.db.patch(siteId, {
      publishedName: siteData.name,
      publishedLogoUrl: siteData.logoUrl,
      publishedDefaultPageId: siteData.defaultPageId,
      publishedSettings: siteData.settings,
      lastDeployedAt: now,
      lastDeployedBy: auth.userId,
      deploymentVersion: newVersion,
    });

    // Restore page published fields from snapshot
    const pageTreeData = pageTreeSnapshot.data as Array<{
      _id: Id<"pages">;
      title: string;
      slug: string;
      icon?: string;
      order: number;
      parentId?: Id<"pages">;
      pageTabs?: Array<{ id: string; label: string }>;
    }>;

    // First, mark all pages as not deployed
    const allPages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    for (const page of allPages) {
      await ctx.db.patch(page._id, { isDeployed: false });
    }

    // Restore published fields for pages in snapshot
    for (const pageData of pageTreeData) {
      const page = await ctx.db.get(pageData._id);
      if (page) {
        await ctx.db.patch(pageData._id, {
          publishedTitle: pageData.title,
          publishedSlug: pageData.slug,
          publishedIcon: pageData.icon,
          publishedOrder: pageData.order,
          publishedParentId: pageData.parentId,
          publishedPageTabs: pageData.pageTabs,
          isDeployed: true,
        });
      }
    }

    // Restore layout published fields from snapshots
    // First, mark all layouts as not deployed
    for (const page of allPages) {
      const layouts = await ctx.db
        .query("layouts")
        .withIndex("by_page", (q) => q.eq("pageId", page._id))
        .collect();

      for (const layout of layouts) {
        await ctx.db.patch(layout._id, {
          isDeployed: false,
          publishedSlots: undefined,
          publishedType: undefined,
          publishedOrder: undefined,
          publishedSettings: undefined,
          publishedTabId: undefined,
        });
      }
    }

    // Restore from page-layouts snapshots
    for (const layoutSnapshot of pageLayoutSnapshots) {
      // Parse stringified data (or use directly for legacy snapshots)
      const layoutsData = (
        typeof layoutSnapshot.data === "string"
          ? JSON.parse(layoutSnapshot.data)
          : layoutSnapshot.data
      ) as Array<{
        _id: Id<"layouts">;
        type: string;
        order: number;
        tabId?: string;
        slots: any;
        settings: any;
      }>;

      for (const layoutData of layoutsData) {
        const layout = await ctx.db.get(layoutData._id);
        if (layout) {
          await ctx.db.patch(layoutData._id, {
            publishedSlots: layoutData.slots,
            publishedType: layoutData.type as any,
            publishedOrder: layoutData.order,
            publishedSettings: layoutData.settings,
            publishedTabId: layoutData.tabId,
            isDeployed: true,
          });
        }
      }
    }

    return rollbackDeploymentId;
  },
});
