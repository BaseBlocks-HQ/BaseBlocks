import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation } from "../_generated/server";
import { requirePublisher } from "../auth";

async function getNextDeploymentVersion(ctx: MutationCtx, siteId: Id<"sites">) {
  const deployments = await ctx.db
    .query("deployments")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .collect();
  return (
    deployments.reduce((version, item) => Math.max(version, item.version), 0) +
    1
  );
}

async function supersedeActiveDeployment(
  ctx: MutationCtx,
  siteId: Id<"sites">,
  status: "superseded" | "rolled-back",
) {
  const activeDeployment = await ctx.db
    .query("deployments")
    .withIndex("by_site_status", (q) =>
      q.eq("siteId", siteId).eq("status", "active"),
    )
    .first();

  if (activeDeployment) {
    await ctx.db.patch(activeDeployment._id, { status });
  }
}

export async function createDeploymentRevision(
  ctx: MutationCtx,
  {
    notes,
    siteId,
    statusForPrevious = "superseded",
  }: {
    siteId: Id<"sites">;
    notes?: string;
    statusForPrevious?: "superseded" | "rolled-back";
  },
) {
  const site = await ctx.db.get(siteId);
  if (!site) throw new Error("Site not found");

  const { auth } = await requirePublisher(ctx, site.teamId);
  const now = Date.now();
  await supersedeActiveDeployment(ctx, siteId, statusForPrevious);

  const [pages, layouts] = await Promise.all([
    ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect(),
    ctx.db
      .query("layouts")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect(),
  ]);

  const version = await getNextDeploymentVersion(ctx, siteId);
  const deploymentId = await ctx.db.insert("deployments", {
    siteId,
    version,
    deployedBy: auth.userId,
    deployedAt: now,
    notes,
    summary: {
      pagesDeployed: pages.length,
      layoutsDeployed: layouts.length,
      settingsChanged: true,
    },
    status: "active",
  });

  await ctx.db.insert("siteRevisions", {
    deploymentId,
    siteId,
    teamId: site.teamId,
    slug: site.slug,
    name: site.name,
    logoUrl: site.logoUrl,
    defaultPageId: site.defaultPageId,
    visibility: site.visibility,
    settings: site.settings,
    updatedAt: site.updatedAt,
  });

  await Promise.all(
    pages.map((page) =>
      ctx.db.insert("pageRevisions", {
        deploymentId,
        siteId,
        sourcePageId: page._id,
        title: page.title,
        slug: page.slug,
        icon: page.icon,
        order: page.order,
        parentId: page.parentId,
        accessPolicy: page.accessPolicy,
        pageTabs: page.pageTabs,
        showInNavigation: page.showInNavigation,
        updatedAt: page.updatedAt,
      }),
    ),
  );

  await Promise.all(
    layouts.map((layout) =>
      ctx.db.insert("layoutRevisions", {
        deploymentId,
        siteId,
        sourcePageId: layout.pageId,
        sourceLayoutId: layout._id,
        tabId: layout.tabId,
        type: layout.type,
        order: layout.order,
        slots: layout.slots,
        settings: layout.settings,
        updatedAt: layout.updatedAt,
      }),
    ),
  );

  await ctx.db.patch(siteId, {
    isPublished: true,
    publishedAt: site.publishedAt ?? now,
    lastDeployedAt: now,
    lastDeployedBy: auth.userId,
    deploymentVersion: version,
    updatedAt: now,
  });

  return deploymentId;
}

export const deploy = mutation({
  args: {
    siteId: v.id("sites"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { siteId, notes }) => {
    return await createDeploymentRevision(ctx, { siteId, notes });
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

    const [siteRevision, pageRevisions, layoutRevisions] = await Promise.all([
      ctx.db
        .query("siteRevisions")
        .withIndex("by_deployment", (q) =>
          q.eq("deploymentId", targetDeploymentId),
        )
        .first(),
      ctx.db
        .query("pageRevisions")
        .withIndex("by_deployment", (q) =>
          q.eq("deploymentId", targetDeploymentId),
        )
        .collect(),
      ctx.db
        .query("layoutRevisions")
        .withIndex("by_deployment", (q) =>
          q.eq("deploymentId", targetDeploymentId),
        )
        .collect(),
    ]);

    if (!siteRevision) {
      throw new Error("Incomplete deployment revision");
    }

    const now = Date.now();
    await supersedeActiveDeployment(ctx, siteId, "rolled-back");
    const version = await getNextDeploymentVersion(ctx, siteId);
    const rollbackDeploymentId = await ctx.db.insert("deployments", {
      siteId,
      version,
      deployedBy: auth.userId,
      deployedAt: now,
      notes: notes || `Rollback to v${targetDeployment.version}`,
      summary: targetDeployment.summary,
      status: "active",
    });

    await ctx.db.insert("siteRevisions", {
      deploymentId: rollbackDeploymentId,
      siteId,
      teamId: siteRevision.teamId,
      slug: siteRevision.slug,
      name: siteRevision.name,
      logoUrl: siteRevision.logoUrl,
      defaultPageId: siteRevision.defaultPageId,
      visibility: siteRevision.visibility,
      settings: siteRevision.settings,
      updatedAt: siteRevision.updatedAt,
    });

    await Promise.all(
      pageRevisions.map((page) =>
        ctx.db.insert("pageRevisions", {
          deploymentId: rollbackDeploymentId,
          siteId,
          sourcePageId: page.sourcePageId,
          title: page.title,
          slug: page.slug,
          icon: page.icon,
          order: page.order,
          parentId: page.parentId,
          accessPolicy: page.accessPolicy,
          pageTabs: page.pageTabs,
          showInNavigation: page.showInNavigation,
          updatedAt: page.updatedAt,
        }),
      ),
    );

    await Promise.all(
      layoutRevisions.map((layout) =>
        ctx.db.insert("layoutRevisions", {
          deploymentId: rollbackDeploymentId,
          siteId,
          sourcePageId: layout.sourcePageId,
          sourceLayoutId: layout.sourceLayoutId,
          tabId: layout.tabId,
          type: layout.type,
          order: layout.order,
          slots: layout.slots,
          settings: layout.settings,
          updatedAt: layout.updatedAt,
        }),
      ),
    );

    await ctx.db.patch(siteId, {
      isPublished: true,
      lastDeployedAt: now,
      lastDeployedBy: auth.userId,
      deploymentVersion: version,
      updatedAt: now,
    });

    return rollbackDeploymentId;
  },
});
