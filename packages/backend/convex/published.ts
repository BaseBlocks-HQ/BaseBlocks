import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { getAuthOrganizationBySlug } from "./authComponent/model";
import { buildReleaseExplorerPayload } from "./libraries";
import { buildPageTree } from "./pages";
import {
  emptyOpenEditorDocument,
  extractOpenEditorReferences,
  parseOpenEditorDocument,
  referencesOpenEditorPage,
} from "./pageContentFormat";
import {
  canRenderPublishedSite,
  isPubliclyPublishedSite,
  resolvePublishedSiteAccess,
} from "./sharing";

async function resolvePublishedSite(
  ctx: QueryCtx,
  organizationSlug: string,
  siteSlug?: string,
) {
  const organization = await getAuthOrganizationBySlug(ctx, organizationSlug);
  if (!organization?.slug) return null;
  const resolvedOrganization = { ...organization, slug: organization.slug };
  const site = siteSlug
    ? await ctx.db
        .query("sites")
        .withIndex("by_organization_slug", (q) =>
          q.eq("organizationId", resolvedOrganization._id).eq("slug", siteSlug),
        )
        .first()
    : (
        await ctx.db
          .query("sites")
          .withIndex("by_organization", (q) =>
            q.eq("organizationId", resolvedOrganization._id),
          )
          .collect()
      ).find((candidate) => candidate.liveReleaseId);
  if (!site?.liveReleaseId) return null;
  const release = await ctx.db.get(site.liveReleaseId);
  return release ? { organization: resolvedOrganization, site, release } : null;
}

function resolvePage(
  pages: Doc<"releasePages">[],
  defaultPageId: Id<"pages"> | undefined,
  path: string[],
) {
  if (path.length === 0) {
    return (
      pages.find((page) => page.pageId === defaultPageId) ??
      pages
        .filter((page) => !page.parentId)
        .sort((a, b) => a.order - b.order)[0] ??
      null
    );
  }
  let parentId: Id<"pages"> | undefined;
  for (const slug of path) {
    const page = pages.find(
      (candidate) => candidate.slug === slug && candidate.parentId === parentId,
    );
    if (!page) return null;
    parentId = page.pageId;
  }
  return pages.find((page) => page.pageId === parentId) ?? null;
}

function getCanonicalPagePath(
  pages: Doc<"releasePages">[],
  page: Doc<"releasePages">,
  defaultPageId: Id<"pages"> | undefined,
) {
  if (page.pageId === defaultPageId) return [];
  const path = [page.slug];
  let parentId = page.parentId;
  while (parentId) {
    const parent = pages.find((candidate) => candidate.pageId === parentId);
    if (!parent) break;
    path.unshift(parent.slug);
    parentId = parent.parentId;
  }
  return path;
}

async function readReleasePageContent(
  ctx: QueryCtx,
  page: Doc<"releasePages"> | null,
) {
  if (!page?.blobId) return emptyOpenEditorDocument();
  const blob = await ctx.db.get(page.blobId);
  return blob
    ? parseOpenEditorDocument(blob.content)
    : emptyOpenEditorDocument();
}

export const sitemap = query({
  args: {
    organizationSlug: v.string(),
    siteSlug: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const organization = await getAuthOrganizationBySlug(
      ctx,
      args.organizationSlug,
    );
    if (!organization?.slug) return [];
    const sites = (
      await ctx.db
        .query("sites")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organization._id),
        )
        .collect()
    ).filter(
      (site) =>
        isPubliclyPublishedSite(site) &&
        (!args.siteSlug || site.slug === args.siteSlug),
    );

    return Promise.all(
      sites.map(async (site) => {
        const release = site.liveReleaseId
          ? await ctx.db.get(site.liveReleaseId)
          : null;
        if (!release) return null;
        const pages = await ctx.db
          .query("releasePages")
          .withIndex("by_release", (q) => q.eq("releaseId", release._id))
          .collect();
        return {
          siteSlug: site.slug,
          updatedAt: release.createdAt,
          pages: pages.map((page) => ({
            path: getCanonicalPagePath(pages, page, release.defaultPageId),
            updatedAt: page.updatedAt,
          })),
        };
      }),
    ).then((results) => results.filter((result) => result !== null));
  },
});

export const resolve = query({
  args: {
    organizationSlug: v.string(),
    siteSlug: v.optional(v.string()),
    pagePath: v.array(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const resolved = await resolvePublishedSite(
      ctx,
      args.organizationSlug,
      args.siteSlug,
    );
    if (!resolved) return null;
    const { organization, site, release } = resolved;
    const access = await resolvePublishedSiteAccess(ctx, site);
    if (
      access.kind === "authentication-required" ||
      access.kind === "forbidden"
    ) {
      return {
        access: { status: access.kind, visibility: "private" as const },
      };
    }
    if (!canRenderPublishedSite(access)) return null;

    const allPages = await ctx.db
      .query("releasePages")
      .withIndex("by_release", (q) => q.eq("releaseId", release._id))
      .collect();
    const page = resolvePage(allPages, release.defaultPageId, args.pagePath);
    if (!page) {
      return {
        access: { status: "missing" as const, visibility: site.visibility },
      };
    }

    const parentPage = page.parentId
      ? (allPages.find((candidate) => candidate.pageId === page.parentId) ??
        null)
      : null;
    const [content, parentContent] = await Promise.all([
      readReleasePageContent(ctx, page),
      readReleasePageContent(ctx, parentPage),
    ]);
    const libraryIds = Array.from(
      extractOpenEditorReferences(content).libraryIds,
    ).flatMap((value) => {
      const id = ctx.db.normalizeId("documentLibraries", value);
      return id ? [id] : [];
    });
    const libraries = (
      await Promise.all(
        libraryIds.map(async (libraryId) => {
          const library = await ctx.db
            .query("releaseLibraries")
            .withIndex("by_release_library", (q) =>
              q.eq("releaseId", release._id).eq("libraryId", libraryId),
            )
            .unique();
          return library
            ? buildReleaseExplorerPayload(ctx, release, library, site)
            : null;
        }),
      )
    ).filter((library) => library !== null);
    const isOpenEditorPageBlock = parentPage
      ? referencesOpenEditorPage(parentContent, page.pageId)
      : false;

    return {
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        logoUrl: organization.logo ?? undefined,
      },
      site: {
        _id: site._id,
        name: release.name,
        slug: site.slug,
        logoUrl: release.logoFileId
          ? `/api/files/${release.logoFileId}`
          : undefined,
        visibility: site.visibility,
        settings: release.settings,
        updatedAt: release.createdAt,
      },
      page: {
        _id: page.pageId,
        title: page.title,
        slug: page.slug,
        icon: page.icon,
        parentId: page.parentId,
        isOpenEditorPageBlock,
        updatedAt: page.updatedAt,
      },
      content,
      libraries,
      navigation: buildPageTree(
        allPages.map((item) => ({
          _id: item.pageId,
          siteId: item.siteId,
          title: item.title,
          slug: item.slug,
          icon: item.icon,
          order: item.order,
          parentId: item.parentId,
        })),
      ),
      access: { status: "accessible" as const, visibility: site.visibility },
      canonicalUrlInputs: {
        organizationSlug: organization.slug,
        siteSlug: site.slug,
        pagePath: getCanonicalPagePath(allPages, page, release.defaultPageId),
      },
      updatedAt: page.updatedAt,
    };
  },
});

export const getFavicon = query({
  args: {
    organizationSlug: v.string(),
    siteSlug: v.optional(v.string()),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const resolved = await resolvePublishedSite(
      ctx,
      args.organizationSlug,
      args.siteSlug,
    );
    if (!resolved || !isPubliclyPublishedSite(resolved.site)) return null;
    return resolved.release.settings.favicon ?? null;
  },
});

export const getPageById = query({
  args: { pageId: v.id("pages") },
  returns: v.any(),
  handler: async (ctx, { pageId }) => {
    const draftPage = await ctx.db.get(pageId);
    if (!draftPage) return null;
    const site = await ctx.db.get(draftPage.siteId);
    if (!site?.liveReleaseId) return null;
    const access = await resolvePublishedSiteAccess(ctx, site);
    if (!canRenderPublishedSite(access)) return null;
    const page = await ctx.db
      .query("releasePages")
      .withIndex("by_release_page", (q) =>
        q.eq("releaseId", site.liveReleaseId!).eq("pageId", pageId),
      )
      .unique();
    if (!page) return null;
    return {
      page: {
        _id: page.pageId,
        title: page.title,
        slug: page.slug,
        icon: page.icon,
        parentId: page.parentId,
      },
      content: await readReleasePageContent(ctx, page),
    };
  },
});
