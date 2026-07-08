import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { requirePublisher } from "../auth";

function countBlocks(blocks: unknown[]): number {
  let count = 0;

  for (const block of blocks) {
    count++;
    if (typeof block !== "object" || block === null) continue;

    if ("blocks" in block && Array.isArray(block.blocks)) {
      count += countBlocks(block.blocks);
    }

    if ("rows" in block && Array.isArray(block.rows)) {
      for (const row of block.rows) {
        if (
          typeof row === "object" &&
          row !== null &&
          "blocks" in row &&
          Array.isArray(row.blocks)
        ) {
          count += countBlocks(row.blocks);
        }
      }
    }

    if ("columns" in block && Array.isArray(block.columns)) {
      for (const column of block.columns) {
        if (
          typeof column === "object" &&
          column !== null &&
          "blocks" in column &&
          Array.isArray(column.blocks)
        ) {
          count += countBlocks(column.blocks);
        }
      }
    }

    if ("cells" in block && Array.isArray(block.cells)) {
      for (const cell of block.cells) {
        if (
          typeof cell === "object" &&
          cell !== null &&
          "blocks" in cell &&
          Array.isArray(cell.blocks)
        ) {
          count += countBlocks(cell.blocks);
        }
      }
    }

    const sidebarSlots = [
      (block as { main?: unknown }).main,
      (block as { aside?: unknown }).aside,
    ];
    for (const slot of sidebarSlots) {
      if (
        typeof slot === "object" &&
        slot !== null &&
        "blocks" in slot &&
        Array.isArray((slot as { blocks?: unknown }).blocks)
      ) {
        count += countBlocks((slot as { blocks: unknown[] }).blocks);
      }
    }

    if ("tabs" in block && Array.isArray(block.tabs)) {
      for (const tab of block.tabs) {
        if (
          typeof tab === "object" &&
          tab !== null &&
          "blocks" in tab &&
          Array.isArray(tab.blocks)
        ) {
          count += countBlocks(tab.blocks);
        }
      }
    }
  }

  return count;
}

export const deploy = mutation({
  args: {
    siteId: v.id("sites"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { siteId, notes }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    const { auth } = await requirePublisher(ctx, site.teamId);
    const now = Date.now();

    const activeDeployment = await ctx.db
      .query("deployments")
      .withIndex("by_site_status", (q) =>
        q.eq("siteId", siteId).eq("status", "active"),
      )
      .first();

    if (activeDeployment) {
      await ctx.db.patch(activeDeployment._id, { status: "superseded" });
    }

    const pages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
    const blocksDeployed = pages.reduce(
      (total, page) => total + countBlocks(page.content.blocks),
      0,
    );

    const newVersion = (site.deploymentVersion ?? 0) + 1;
    const deploymentId = await ctx.db.insert("deployments", {
      siteId,
      version: newVersion,
      deployedBy: auth.userId,
      deployedAt: now,
      notes,
      summary: {
        pagesDeployed: pages.length,
        blocksDeployed,
        settingsChanged: true,
      },
      status: "active",
    });

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

    await ctx.db.insert("deploymentSnapshots", {
      deploymentId,
      siteId,
      chunkType: "page-tree",
      data: pages.map((page) => ({
        _id: page._id,
        title: page.title,
        slug: page.slug,
        icon: page.icon,
        order: page.order,
        parentId: page.parentId,
        accessPolicy: page.accessPolicy,
        content: page.content,
      })),
    });

    await ctx.db.patch(siteId, {
      publishedName: site.name,
      publishedLogoUrl: site.logoUrl,
      publishedDefaultPageId: site.defaultPageId,
      publishedSettings: site.settings,
      lastDeployedAt: now,
      lastDeployedBy: auth.userId,
      deploymentVersion: newVersion,
    });

    for (const page of pages) {
      await ctx.db.patch(page._id, {
        publishedTitle: page.title,
        publishedSlug: page.slug,
        publishedIcon: page.icon,
        publishedOrder: page.order,
        publishedParentId: page.parentId,
        publishedAccessPolicy: page.accessPolicy,
        publishedContent: page.content,
        isDeployed: true,
      });
    }

    return deploymentId;
  },
});

export const rollback = mutation({
  args: {
    siteId: v.id("sites"),
    targetDeploymentId: v.id("deployments"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { siteId, targetDeploymentId, notes }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    const { auth } = await requirePublisher(ctx, site.teamId);
    const targetDeployment = await ctx.db.get(targetDeploymentId);
    if (!targetDeployment || targetDeployment.siteId !== siteId) {
      throw new Error("Deployment not found");
    }

    const now = Date.now();
    const activeDeployment = await ctx.db
      .query("deployments")
      .withIndex("by_site_status", (q) =>
        q.eq("siteId", siteId).eq("status", "active"),
      )
      .first();

    if (activeDeployment) {
      await ctx.db.patch(activeDeployment._id, { status: "rolled-back" });
    }

    const snapshots = await ctx.db
      .query("deploymentSnapshots")
      .withIndex("by_deployment", (q) =>
        q.eq("deploymentId", targetDeploymentId),
      )
      .collect();

    const siteSettingsSnapshot = snapshots.find(
      (snapshot) => snapshot.chunkType === "site-settings",
    );
    const pageTreeSnapshot = snapshots.find(
      (snapshot) => snapshot.chunkType === "page-tree",
    );

    if (!siteSettingsSnapshot || !pageTreeSnapshot) {
      throw new Error("Incomplete deployment snapshot");
    }

    const newVersion = (site.deploymentVersion ?? 0) + 1;
    const rollbackDeploymentId = await ctx.db.insert("deployments", {
      siteId,
      version: newVersion,
      deployedBy: auth.userId,
      deployedAt: now,
      notes: notes || `Rollback to v${targetDeployment.version}`,
      summary: targetDeployment.summary,
      status: "active",
    });

    for (const snapshot of snapshots) {
      await ctx.db.insert("deploymentSnapshots", {
        deploymentId: rollbackDeploymentId,
        siteId: snapshot.siteId,
        chunkType: snapshot.chunkType,
        pageId: snapshot.pageId,
        data: snapshot.data,
      });
    }

    const siteData = siteSettingsSnapshot.data as {
      name: string;
      logoUrl?: string;
      defaultPageId?: Id<"pages">;
      settings: Doc<"sites">["settings"];
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

    const pageTreeData = pageTreeSnapshot.data as Array<{
      _id: Id<"pages">;
      title: string;
      slug: string;
      icon?: string;
      order: number;
      parentId?: Id<"pages">;
      accessPolicy?: Doc<"pages">["accessPolicy"];
      content: Doc<"pages">["content"];
    }>;

    const allPages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    for (const page of allPages) {
      await ctx.db.patch(page._id, { isDeployed: false });
    }

    for (const pageData of pageTreeData) {
      const page = await ctx.db.get(pageData._id);
      if (!page) continue;

      await ctx.db.patch(pageData._id, {
        publishedTitle: pageData.title,
        publishedSlug: pageData.slug,
        publishedIcon: pageData.icon,
        publishedOrder: pageData.order,
        publishedParentId: pageData.parentId,
        publishedAccessPolicy: pageData.accessPolicy,
        publishedContent: pageData.content,
        isDeployed: true,
      });
    }

    return rollbackDeploymentId;
  },
});
