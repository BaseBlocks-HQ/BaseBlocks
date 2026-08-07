import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { getAuthOrganizationBySlug } from "./authComponent/model";
import { buildReleaseExplorerPayload } from "./libraries";
import {
  canonicalPagePath,
  getReadableLiveRelease,
  resolveReleasePage,
} from "./model/publishedRelease";
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

const MAX_PAGE_EXPORT_ASSETS = 64;

async function readReleasePageContent(
  ctx: QueryCtx,
  page: Doc<"releasePages"> | null,
) {
  if (page?.contentRevisionId) {
    const revision = await ctx.db.get(page.contentRevisionId);
    const payload = revision ? await ctx.db.get(revision.payloadId) : null;
    return payload
      ? parseOpenEditorDocument(payload.content)
      : emptyOpenEditorDocument();
  }
  return emptyOpenEditorDocument();
}

async function getPublishedSiteBySlug(
  ctx: QueryCtx,
  organizationSlug: string,
  siteSlug: string,
) {
  const organization = await getAuthOrganizationBySlug(ctx, organizationSlug);
  if (!organization?.slug) return null;
  const site = await ctx.db
    .query("sites")
    .withIndex("by_organization_slug", (q) =>
      q.eq("organizationId", organization._id).eq("slug", siteSlug),
    )
    .unique();
  if (!site?.liveReleaseId) return null;
  const release = await ctx.db.get(site.liveReleaseId);
  return release
    ? {
        organization: { ...organization, slug: organization.slug },
        site,
        release,
      }
    : null;
}

function projectAccessibleSite(
  organization: {
    _id: string;
    name: string;
    slug: string;
    logo?: string | null;
  },
  site: Doc<"sites">,
  release: Doc<"siteReleases">,
) {
  return {
    access: { status: "accessible" as const, visibility: site.visibility },
    releaseId: release._id,
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
  };
}

/** Resolve only site identity, access, and the immutable live release. */
export const resolveSite = query({
  args: {
    organizationSlug: v.string(),
    siteSlug: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const resolved = await getPublishedSiteBySlug(
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
    return projectAccessibleSite(organization, site, release);
  },
});

/** Read one page through release-scoped indexes; never scans the release. */
export const getPage = query({
  args: {
    releaseId: v.id("siteReleases"),
    path: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, { releaseId, path }) => {
    const context = await getReadableLiveRelease(ctx, releaseId);
    if (!context) return null;
    const resolved = await resolveReleasePage(ctx, context.release, path);
    if (!resolved) return null;

    const parentPage = resolved.ancestors.at(-1) ?? null;
    const [content, revision, parentRevision] = await Promise.all([
      readReleasePageContent(ctx, resolved.page),
      resolved.page.contentRevisionId
        ? ctx.db.get(resolved.page.contentRevisionId)
        : null,
      parentPage?.contentRevisionId
        ? ctx.db.get(parentPage.contentRevisionId)
        : null,
    ]);
    const parentContent =
      parentPage && !parentRevision
        ? await readReleasePageContent(ctx, parentPage)
        : null;
    const libraryIds =
      revision?.libraryIds ??
      Array.from(extractOpenEditorReferences(content).libraryIds)
        .flatMap((value) => {
          const id = ctx.db.normalizeId("documentLibraries", value);
          return id ? [id] : [];
        })
        .sort();

    return {
      page: {
        _id: resolved.page.pageId,
        title: resolved.page.title,
        slug: resolved.page.slug,
        icon: resolved.page.icon,
        parentId: resolved.page.parentId,
        isOpenEditorPageBlock: parentPage
          ? parentRevision
            ? parentRevision.pageIds.includes(resolved.page.pageId)
            : parentContent
              ? referencesOpenEditorPage(parentContent, resolved.page.pageId)
              : false
          : false,
        updatedAt: resolved.page.updatedAt,
      },
      content,
      libraryIds,
      canonicalPath: canonicalPagePath(context.release, resolved),
      updatedAt: resolved.page.updatedAt,
    };
  },
});

/** Read the immutable SEO projection without loading page content or navigation. */
export const getPageMetadata = query({
  args: {
    releaseId: v.id("siteReleases"),
    path: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, { releaseId, path }) => {
    const context = await getReadableLiveRelease(ctx, releaseId);
    if (!context) return null;
    const resolved = await resolveReleasePage(ctx, context.release, path);
    if (!resolved) return null;
    return {
      title: resolved.page.title,
      descriptionText: resolved.page.descriptionText || resolved.page.title,
      canonicalPath: canonicalPagePath(context.release, resolved),
      updatedAt: resolved.page.updatedAt,
    };
  },
});

/** Read release navigation once per immutable release. */
export const getNavigation = query({
  args: { releaseId: v.id("siteReleases") },
  returns: v.any(),
  handler: async (ctx, { releaseId }) => {
    const context = await getReadableLiveRelease(ctx, releaseId);
    if (!context) return null;
    const pages = await ctx.db
      .query("releasePages")
      .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
      .collect();
    return buildPageTree(
      pages.map((page) => ({
        _id: page.pageId,
        siteId: page.siteId,
        title: page.title,
        slug: page.slug,
        icon: page.icon,
        order: page.order,
        parentId: page.parentId,
      })),
    );
  },
});

/** Read only the released libraries referenced by the requested page. */
export const getLibraries = query({
  args: {
    releaseId: v.id("siteReleases"),
    libraryIds: v.array(v.id("documentLibraries")),
  },
  returns: v.any(),
  handler: async (ctx, { releaseId, libraryIds }) => {
    const context = await getReadableLiveRelease(ctx, releaseId);
    if (!context) return null;
    const uniqueLibraryIds = Array.from(new Set(libraryIds)).sort();
    return (
      await Promise.all(
        uniqueLibraryIds.map(async (libraryId) => {
          const library = await ctx.db
            .query("releaseLibraries")
            .withIndex("by_release_library", (q) =>
              q.eq("releaseId", releaseId).eq("libraryId", libraryId),
            )
            .unique();
          return library
            ? buildReleaseExplorerPayload(
                ctx,
                context.release,
                library,
                context.site,
              )
            : null;
        }),
      )
    ).filter((library) => library !== null);
  },
});

function getCanonicalPagePathFromMap(
  pagesById: Map<Id<"pages">, Doc<"releasePages">>,
  page: Doc<"releasePages">,
  defaultPageId: Id<"pages"> | undefined,
) {
  if (page.pageId === defaultPageId) return [];
  const path = [page.slug];
  const visited = new Set<Id<"pages">>([page.pageId]);
  let parentId = page.parentId;
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = pagesById.get(parentId);
    if (!parent) break;
    path.unshift(parent.slug);
    parentId = parent.parentId;
  }
  return path;
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
        const pagesById = new Map(pages.map((page) => [page.pageId, page]));
        return {
          siteSlug: site.slug,
          updatedAt: release.createdAt,
          pages: pages.map((page) => ({
            path: getCanonicalPagePathFromMap(
              pagesById,
              page,
              release.defaultPageId,
            ),
            updatedAt: page.updatedAt,
          })),
        };
      }),
    ).then((results) => results.filter((result) => result !== null));
  },
});

export const getFavicon = query({
  args: {
    organizationSlug: v.string(),
    siteSlug: v.string(),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const resolved = await getPublishedSiteBySlug(
      ctx,
      args.organizationSlug,
      args.siteSlug,
    );
    if (!resolved || !isPubliclyPublishedSite(resolved.site)) return null;
    return resolved.release.settings.favicon ?? null;
  },
});

export const getPageExport = query({
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
    const content = await readReleasePageContent(ctx, page);
    const revision = page.contentRevisionId
      ? await ctx.db.get(page.contentRevisionId)
      : null;
    const imageIds = [...extractOpenEditorReferences(content).imageIds];
    if (imageIds.length > MAX_PAGE_EXPORT_ASSETS) {
      throw new Error(
        `Page export exceeds the ${MAX_PAGE_EXPORT_ASSETS}-image limit`,
      );
    }
    const revisionFileIds = new Set(revision?.fileIds ?? []);
    const releaseImageIds = imageIds.filter((fileId) =>
      revisionFileIds.has(fileId as Id<"files">),
    );
    const assets = revision
      ? (
          await Promise.all(
            releaseImageIds.map((fileId) =>
              ctx.db
                .query("releaseFiles")
                .withIndex("by_release_file", (q) =>
                  q
                    .eq("releaseId", site.liveReleaseId!)
                    .eq("fileId", fileId as Id<"files">),
                )
                .unique(),
            ),
          )
        ).flatMap((asset) =>
          asset?.kind === "siteAsset" &&
          asset.contentType.toLowerCase().startsWith("image/")
            ? [
                {
                  fileId: asset.fileId,
                  objectKey: asset.objectKey,
                  filename: asset.filename,
                  contentType: asset.contentType,
                  size: asset.size,
                  checksum: asset.checksum,
                },
              ]
            : [],
        )
      : [];
    return {
      page: {
        _id: page.pageId,
        title: page.title,
        slug: page.slug,
        icon: page.icon,
        parentId: page.parentId,
      },
      content,
      assets,
    };
  },
});
