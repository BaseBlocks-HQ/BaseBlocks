import type { GenericQueryCtx } from "convex/server";
import type { DataModel, Doc, Id } from "../_generated/dataModel";

type QueryCtx = Pick<GenericQueryCtx<DataModel>, "db">;

export type PublicSiteRevision = Doc<"siteRevisions"> & {
  isPublished: true;
};

export type PublicPageRevision = Omit<Doc<"pageRevisions">, "_id"> & {
  _id: Id<"pages">;
  siteId: Id<"sites">;
};

export type PublicLayoutRevision = Omit<Doc<"layoutRevisions">, "_id"> & {
  _id: Id<"layouts">;
  pageId: Id<"pages">;
  siteId: Id<"sites">;
};

export async function getActiveDeployment(ctx: QueryCtx, siteId: Id<"sites">) {
  return await ctx.db
    .query("deployments")
    .withIndex("by_site_status", (q) =>
      q.eq("siteId", siteId).eq("status", "active"),
    )
    .first();
}

export async function getActiveSiteRevision(
  ctx: QueryCtx,
  siteId: Id<"sites">,
): Promise<PublicSiteRevision | null> {
  const deployment = await getActiveDeployment(ctx, siteId);
  if (!deployment) return null;

  const revision = await ctx.db
    .query("siteRevisions")
    .withIndex("by_deployment", (q) => q.eq("deploymentId", deployment._id))
    .first();

  return revision ? { ...revision, isPublished: true as const } : null;
}

export async function getActivePageRevisions(
  ctx: QueryCtx,
  siteId: Id<"sites">,
): Promise<PublicPageRevision[]> {
  const deployment = await getActiveDeployment(ctx, siteId);
  if (!deployment) return [];

  const pages = await ctx.db
    .query("pageRevisions")
    .withIndex("by_deployment", (q) => q.eq("deploymentId", deployment._id))
    .collect();

  return pages.map((page) => ({
    ...page,
    _id: page.sourcePageId,
    siteId: page.siteId,
  }));
}

export async function getActivePageRevisionBySourceId(
  ctx: QueryCtx,
  pageId: Id<"pages">,
): Promise<PublicPageRevision | null> {
  const page = await ctx.db.get(pageId);
  if (!page) return null;

  const deployment = await getActiveDeployment(ctx, page.siteId);
  if (!deployment) return null;

  const revision = await ctx.db
    .query("pageRevisions")
    .withIndex("by_deployment_source", (q) =>
      q.eq("deploymentId", deployment._id).eq("sourcePageId", pageId),
    )
    .first();

  return revision
    ? { ...revision, _id: revision.sourcePageId, siteId: revision.siteId }
    : null;
}

export async function getActiveLayoutRevisionsForPage(
  ctx: QueryCtx,
  pageId: Id<"pages">,
): Promise<PublicLayoutRevision[]> {
  const page = await ctx.db.get(pageId);
  if (!page) return [];

  const deployment = await getActiveDeployment(ctx, page.siteId);
  if (!deployment) return [];

  const layouts = await ctx.db
    .query("layoutRevisions")
    .withIndex("by_deployment_page", (q) =>
      q.eq("deploymentId", deployment._id).eq("sourcePageId", pageId),
    )
    .collect();

  return layouts.map((layout) => ({
    ...layout,
    _id: layout.sourceLayoutId,
    pageId: layout.sourcePageId,
    siteId: layout.siteId,
  }));
}
