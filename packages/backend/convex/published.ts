import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import {
  getAuthOrganizationBySlug,
  listAuthOrganizations,
} from "./authComponent/model";
import { buildPageTree } from "./pages";
import { hydrateDeepBlockContent } from "./pageContent";
import { getAccessiblePublishedPages } from "./sharing";

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

function pagePath(page: Doc<"pages">, pagesById: Map<string, Doc<"pages">>) {
  const segments: string[] = [];
  let current: Doc<"pages"> | undefined = page;
  while (current) {
    segments.unshift(current.slug);
    current = current.parentId ? pagesById.get(current.parentId) : undefined;
  }
  return segments;
}

async function pageContent(ctx: QueryCtx, pageId: Id<"pages">) {
  const [legacy, native] = await Promise.all([
    ctx.db
      .query("pageContents")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .unique(),
    ctx.db
      .query("openEditorPageContents")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .unique(),
  ]);
  return {
    tabs: legacy?.tabs ?? [],
    sections: legacy ? hydrateDeepBlockContent(legacy.sections) : [],
    openEditorDocument: native?.document,
    migratedAt: native?.migratedAt,
  };
}

export const resolve = query({
  args: {
    organizationSlug: v.string(),
    siteSlug: v.optional(v.string()),
    pagePath: v.array(v.string()),
    sessionTokens: v.optional(v.array(v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const organization = await getAuthOrganizationBySlug(
      ctx,
      args.organizationSlug,
    );
    if (!organization?.slug) return null;
    const sites = await ctx.db
      .query("sites")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .collect();
    const site = args.siteSlug
      ? sites.find((candidate) => candidate.slug === args.siteSlug)
      : sites.find((candidate) => candidate.isPublished);
    if (!site?.isPublished) return null;
    const accessiblePages = await getAccessiblePublishedPages(
      ctx,
      site,
      args.sessionTokens,
    );
    const page = resolvePage(
      accessiblePages,
      site.defaultPageId,
      args.pagePath,
    );
    const allPages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", site._id))
      .collect();
    const status = page
      ? "accessible"
      : resolvePage(allPages, site.defaultPageId, args.pagePath)
        ? "forbidden"
        : "missing";
    const pagesById = new Map(accessiblePages.map((item) => [item._id, item]));
    const breadcrumbs = page
      ? pagePath(page, pagesById)
          .map((_, index, path) => {
            const target = accessiblePages.find(
              (item) =>
                pagePath(item, pagesById).join("/") ===
                path.slice(0, index + 1).join("/"),
            );
            return target
              ? {
                  id: target._id,
                  title: target.title,
                  path: path.slice(0, index + 1),
                }
              : null;
          })
          .filter((crumb): crumb is NonNullable<typeof crumb> => crumb !== null)
      : [];
    const content = page
      ? await pageContent(ctx, page._id)
      : { tabs: [], sections: [] };
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
        visibility: site.visibility ?? "public",
        settings: site.settings,
        updatedAt: site.updatedAt,
      },
      page: page
        ? {
            _id: page._id,
            title: page.title,
            slug: page.slug,
            updatedAt: page.updatedAt,
          }
        : null,
      pageContent: content,
      navigation: buildPageTree(
        accessiblePages
          .filter((item) => item.showInNavigation !== false)
          .map((item) => ({
            _id: item._id,
            siteId: item.siteId,
            title: item.title,
            slug: item.slug,
            icon: item.icon,
            order: item.order,
            parentId: item.parentId,
          })),
      ),
      breadcrumbs,
      access: { status, visibility: site.visibility ?? "public" },
      customization: site.settings.customization,
      canonicalUrlInputs: {
        organizationSlug: organization.slug,
        siteSlug: site.slug,
        pagePath: args.pagePath,
      },
      updatedAt: Math.max(
        site.updatedAt,
        page?.updatedAt ?? 0,
        page
          ? Math.max(
              (
                await ctx.db
                  .query("pageContents")
                  .withIndex("by_page", (q) => q.eq("pageId", page._id))
                  .unique()
              )?.updatedAt ?? 0,
              (
                await ctx.db
                  .query("openEditorPageContents")
                  .withIndex("by_page", (q) => q.eq("pageId", page._id))
                  .unique()
              )?.updatedAt ?? 0,
            )
          : 0,
      ),
    };
  },
});

export const sitemap = query({
  args: {},
  returns: v.array(
    v.object({
      organizationSlug: v.string(),
      siteSlug: v.string(),
      customDomain: v.optional(v.string()),
      pagePath: v.array(v.string()),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const [organizations, sites] = await Promise.all([
      listAuthOrganizations(ctx),
      ctx.db
        .query("sites")
        .withIndex("by_published", (q) => q.eq("isPublished", true))
        .collect(),
    ]);
    const slugs = new Map(
      organizations.flatMap((organization) =>
        organization.slug
          ? [[organization._id, organization.slug] as const]
          : [],
      ),
    );
    const entries: Array<{
      organizationSlug: string;
      siteSlug: string;
      customDomain?: string;
      pagePath: string[];
      updatedAt: number;
    }> = [];
    for (const site of sites) {
      if (site.visibility && site.visibility !== "public") continue;
      const organizationSlug = slugs.get(site.organizationId);
      if (!organizationSlug) continue;
      const [pages, contents, domain] = await Promise.all([
        ctx.db
          .query("pages")
          .withIndex("by_site", (q) => q.eq("siteId", site._id))
          .collect(),
        ctx.db
          .query("pageContents")
          .withIndex("by_site", (q) => q.eq("siteId", site._id))
          .collect(),
        ctx.db
          .query("siteDomains")
          .withIndex("by_site", (q) => q.eq("siteId", site._id))
          .filter((q) => q.eq(q.field("status"), "verified"))
          .first(),
      ]);
      const pagesById = new Map(pages.map((page) => [page._id, page]));
      const contentUpdatedAt = new Map(
        contents.map((content) => [content.pageId, content.updatedAt]),
      );
      const defaultPage =
        pages.find((page) => page._id === site.defaultPageId) ??
        pages
          .filter((page) => !page.parentId)
          .sort((a, b) => a.order - b.order)[0];
      entries.push({
        organizationSlug,
        siteSlug: site.slug,
        customDomain: domain?.hostname,
        pagePath: [],
        updatedAt: Math.max(
          site.updatedAt,
          defaultPage?.updatedAt ?? 0,
          defaultPage ? (contentUpdatedAt.get(defaultPage._id) ?? 0) : 0,
        ),
      });
      for (const page of pages) {
        if (page._id === defaultPage?._id) continue;
        entries.push({
          organizationSlug,
          siteSlug: site.slug,
          customDomain: domain?.hostname,
          pagePath: pagePath(page, pagesById),
          updatedAt: Math.max(
            site.updatedAt,
            page.updatedAt,
            contentUpdatedAt.get(page._id) ?? 0,
          ),
        });
      }
    }
    return entries;
  },
});
