import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { isReleaseAvailable } from "./releaseState";
import { canRenderPublishedSite, resolvePublishedSiteAccess } from "../sharing";

export type ResolvedReleasePage = {
  page: Doc<"releasePages">;
  ancestors: Doc<"releasePages">[];
};

export function parsePublishedPagePath(path: string): string[] {
  if (!path) return [];
  return path.split("/").filter(Boolean);
}

async function getReleasePageById(
  ctx: QueryCtx,
  releaseId: Id<"siteReleases">,
  pageId: Id<"pages">,
) {
  return ctx.db
    .query("releasePages")
    .withIndex("by_release_page", (q) =>
      q.eq("releaseId", releaseId).eq("pageId", pageId),
    )
    .unique();
}

async function collectAncestors(
  ctx: QueryCtx,
  releaseId: Id<"siteReleases">,
  page: Doc<"releasePages">,
) {
  const ancestors: Doc<"releasePages">[] = [];
  const visited = new Set<string>([page.pageId]);
  let parentId = page.parentId;

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = await getReleasePageById(ctx, releaseId, parentId);
    if (!parent) break;
    ancestors.unshift(parent);
    parentId = parent.parentId;
  }

  return ancestors;
}

export async function resolveReleasePage(
  ctx: QueryCtx,
  release: Doc<"siteReleases">,
  path: string,
): Promise<ResolvedReleasePage | null> {
  const segments = parsePublishedPagePath(path);
  let page: Doc<"releasePages"> | null = null;

  if (segments.length === 0) {
    page = release.defaultPageId
      ? await getReleasePageById(ctx, release._id, release.defaultPageId)
      : await ctx.db
          .query("releasePages")
          .withIndex("by_release_parent_order", (q) =>
            q.eq("releaseId", release._id).eq("parentId", undefined),
          )
          .order("asc")
          .first();
  } else {
    let parentId: Id<"pages"> | undefined;
    for (const slug of segments) {
      page = await ctx.db
        .query("releasePages")
        .withIndex("by_release_parent_slug", (q) =>
          q
            .eq("releaseId", release._id)
            .eq("parentId", parentId)
            .eq("slug", slug),
        )
        .unique();
      if (!page) return null;
      parentId = page.pageId;
    }
  }

  if (!page) return null;
  return {
    page,
    ancestors: await collectAncestors(ctx, release._id, page),
  };
}

export function canonicalPagePath(
  release: Pick<Doc<"siteReleases">, "defaultPageId">,
  resolved: ResolvedReleasePage,
): string[] {
  if (resolved.page.pageId === release.defaultPageId) return [];
  return [...resolved.ancestors, resolved.page].map((page) => page.slug);
}

export async function getReadableLiveRelease(
  ctx: QueryCtx,
  releaseId: Id<"siteReleases">,
) {
  const release = await ctx.db.get(releaseId);
  if (!release || !isReleaseAvailable(release)) return null;
  const site = await ctx.db.get(release.siteId);
  if (!site || site.liveReleaseId !== release._id) return null;
  const access = await resolvePublishedSiteAccess(ctx, site);
  if (!canRenderPublishedSite(access)) return null;
  return { release, site };
}
