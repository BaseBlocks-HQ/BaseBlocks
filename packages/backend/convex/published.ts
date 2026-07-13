import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { getAuthOrganizationBySlug } from "./authComponent/model";
import { buildPageTree } from "./pages";
import {
  emptyOpenEditorDocument,
  parseOpenEditorDocument,
} from "./openEditorDocuments";
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

async function pageContent(ctx: QueryCtx, pageId: Id<"pages">) {
  const content = await ctx.db
    .query("openEditorPageContents")
    .withIndex("by_page", (q) => q.eq("pageId", pageId))
    .unique();
  return {
    document: content
      ? parseOpenEditorDocument(content.document)
      : emptyOpenEditorDocument(),
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
    const content = page
      ? await pageContent(ctx, page._id)
      : { document: emptyOpenEditorDocument() };
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
            icon: page.icon,
            parentId: page.parentId,
            updatedAt: page.updatedAt,
          }
        : null,
      pageContent: content,
      pages: accessiblePages.map((item) => ({
        _id: item._id,
        title: item.title,
        slug: item.slug,
        icon: item.icon,
        parentId: item.parentId,
      })),
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
      access: { status, visibility: site.visibility ?? "public" },
      canonicalUrlInputs: {
        organizationSlug: organization.slug,
        siteSlug: site.slug,
        pagePath: args.pagePath,
      },
      updatedAt: Math.max(
        site.updatedAt,
        page?.updatedAt ?? 0,
        page
          ? ((
              await ctx.db
                .query("openEditorPageContents")
                .withIndex("by_page", (q) => q.eq("pageId", page._id))
                .unique()
            )?.updatedAt ?? 0)
          : 0,
      ),
    };
  },
});
