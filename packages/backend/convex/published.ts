import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { getAuthOrganizationBySlug } from "./authComponent/model";
import { buildPageTree } from "./pages";
import {
  emptyOpenEditorDocument,
  parseOpenEditorDocument,
  referencesOpenEditorPage,
} from "./pageContentFormat";
import { canAccessPublishedSite } from "./sharing";

function resolvePage(
  pages: Doc<"pages">[],
  defaultPageId: Id<"pages"> | undefined,
  path: string[],
) {
  if (path.length === 0) {
    return (
      pages.find((page) => page._id === defaultPageId) ??
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
    parentId = page._id;
  }
  return pages.find((page) => page._id === parentId) ?? null;
}

function getCanonicalPagePath(
  pages: Doc<"pages">[],
  page: Doc<"pages">,
  defaultPageId: Id<"pages"> | undefined,
) {
  if (page._id === defaultPageId) return [];
  const path = [page.slug];
  let parentId = page.parentId;
  while (parentId) {
    const parent = pages.find((candidate) => candidate._id === parentId);
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
        site.isPublished &&
        site.visibility === "public" &&
        (!args.siteSlug || site.slug === args.siteSlug),
    );

    return Promise.all(
      sites.map(async (site) => {
        const pages = await ctx.db
          .query("pages")
          .withIndex("by_site", (q) => q.eq("siteId", site._id))
          .collect();
        return {
          siteSlug: site.slug,
          updatedAt: site.updatedAt,
          pages: pages.map((page) => ({
            path: getCanonicalPagePath(pages, page, site.defaultPageId),
            updatedAt: page.updatedAt,
          })),
        };
      }),
    );
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
    const organization = await getAuthOrganizationBySlug(
      ctx,
      args.organizationSlug,
    );
    if (!organization?.slug) return null;
    const site = args.siteSlug
      ? await ctx.db
          .query("sites")
          .withIndex("by_organization_slug", (q) =>
            q.eq("organizationId", organization._id).eq("slug", args.siteSlug!),
          )
          .first()
      : (
          await ctx.db
            .query("sites")
            .withIndex("by_organization", (q) =>
              q.eq("organizationId", organization._id),
            )
            .collect()
        ).find((candidate) => candidate.isPublished);
    if (!site?.isPublished) return null;
    const canAccess = canAccessPublishedSite(site);
    const allPages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", site._id))
      .collect();
    const accessiblePages = canAccess ? allPages : [];
    const visibility = canAccess ? "public" : "private";
    const page = resolvePage(
      accessiblePages,
      site.defaultPageId,
      args.pagePath,
    );
    const status = page
      ? "accessible"
      : resolvePage(allPages, site.defaultPageId, args.pagePath)
        ? "forbidden"
        : "missing";
    const contentRow = page
      ? await ctx.db
          .query("pageContents")
          .withIndex("by_page", (q) => q.eq("pageId", page._id))
          .unique()
      : null;
    const parentContentRow = page?.parentId
      ? await ctx.db
          .query("pageContents")
          .withIndex("by_page", (q) => q.eq("pageId", page.parentId!))
          .unique()
      : null;
    const content = contentRow
      ? parseOpenEditorDocument(contentRow.content)
      : emptyOpenEditorDocument();
    const isOpenEditorPageBlock = parentContentRow
      ? referencesOpenEditorPage(
          parseOpenEditorDocument(parentContentRow.content),
          page?._id ?? "",
        )
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
        name: site.name,
        slug: site.slug,
        logoUrl: site.logoUrl,
        visibility,
        settings: site.settings,
        updatedAt: site.updatedAt,
      },
      page: page
        ? {
            _id: page._id,
            title: page.title,
            slug: page.slug,
            icon: page.icon,
            parentId: page.parentId,
            isOpenEditorPageBlock,
            updatedAt: page.updatedAt,
          }
        : null,
      content,
      navigation: buildPageTree(
        accessiblePages.map((item) => ({
          _id: item._id,
          siteId: item.siteId,
          title: item.title,
          slug: item.slug,
          icon: item.icon,
          order: item.order,
          parentId: item.parentId,
        })),
      ),
      access: { status, visibility },
      canonicalUrlInputs: {
        organizationSlug: organization.slug,
        siteSlug: site.slug,
        pagePath: page
          ? getCanonicalPagePath(allPages, page, site.defaultPageId)
          : args.pagePath,
      },
      updatedAt: Math.max(
        site.updatedAt,
        page?.updatedAt ?? 0,
        contentRow?.updatedAt ?? 0,
      ),
    };
  },
});

export const getPageById = query({
  args: { pageId: v.id("pages") },
  returns: v.any(),
  handler: async (ctx, { pageId }) => {
    const page = await ctx.db.get(pageId);
    if (!page) return null;
    const site = await ctx.db.get(page.siteId);
    if (!site || !canAccessPublishedSite(site)) {
      return null;
    }
    const content = await ctx.db
      .query("pageContents")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .unique();
    return {
      page: {
        _id: page._id,
        title: page.title,
        slug: page.slug,
        icon: page.icon,
        parentId: page.parentId,
      },
      content: content
        ? parseOpenEditorDocument(content.content)
        : emptyOpenEditorDocument(),
    };
  },
});
