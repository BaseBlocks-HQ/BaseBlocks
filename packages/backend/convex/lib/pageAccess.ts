import {
  canAccessPagePolicy,
  normalizePageAccessPolicy,
  publicPageAccessPolicy,
} from "@baseblocks/types";
import type { GenericQueryCtx } from "convex/server";
import { v } from "convex/values";
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import { getAuthContextOrNull } from "../auth";
import { canAccessPublishedSite } from "../sharing/access";

type QueryCtx = GenericQueryCtx<DataModel>;

export const pageAccessPolicyValidator = v.union(
  v.object({
    kind: v.literal("public"),
  }),
  v.object({
    kind: v.literal("audiences"),
    audienceIds: v.array(v.id("siteAudiences")),
  }),
);

type PublishedViewerContext = {
  audienceIds: Set<string>;
  isTeamMember: boolean;
};

type PageForAccess = Pick<
  Doc<"pages">,
  | "_id"
  | "title"
  | "slug"
  | "siteId"
  | "parentId"
  | "publishedTitle"
  | "publishedSlug"
  | "publishedParentId"
  | "order"
  | "publishedOrder"
  | "updatedAt"
  | "icon"
  | "publishedIcon"
  | "pageTabs"
  | "publishedPageTabs"
  | "accessPolicy"
  | "publishedAccessPolicy"
  | "isDeployed"
  | "showInNavigation"
>;

export function getDraftPageAccessPolicy(page: {
  accessPolicy?: Doc<"pages">["accessPolicy"];
}) {
  return normalizePageAccessPolicy(page.accessPolicy ?? publicPageAccessPolicy);
}

export function getPublishedPageAccessPolicy(page: {
  publishedAccessPolicy?: Doc<"pages">["publishedAccessPolicy"];
}) {
  return normalizePageAccessPolicy(
    page.publishedAccessPolicy ?? publicPageAccessPolicy,
  );
}

export async function resolvePublishedViewerContext(
  ctx: QueryCtx,
  site: Doc<"sites">,
  sessionTokens?: string[],
): Promise<PublishedViewerContext | null> {
  const hasSiteAccess = await canAccessPublishedSite(ctx, site, sessionTokens);
  if (!hasSiteAccess) {
    return null;
  }

  const auth = await getAuthContextOrNull(ctx);
  if (!auth) {
    return {
      audienceIds: new Set<string>(),
      isTeamMember: false,
    };
  }

  const member = await ctx.db
    .query("members")
    .withIndex("by_team_user", (q) =>
      q.eq("teamId", site.teamId).eq("userId", auth.userId),
    )
    .first();

  if (!member) {
    return {
      audienceIds: new Set<string>(),
      isTeamMember: false,
    };
  }

  const audienceMemberships = await ctx.db
    .query("siteAudienceMembers")
    .withIndex("by_site_user", (q) =>
      q.eq("siteId", site._id).eq("userId", auth.userId),
    )
    .collect();

  return {
    audienceIds: new Set(
      audienceMemberships.map((membership) => membership.audienceId),
    ),
    isTeamMember: true,
  };
}

export function canViewerAccessPublishedPage(
  page: Pick<Doc<"pages">, "accessPolicy" | "publishedAccessPolicy">,
  viewer: PublishedViewerContext,
): boolean {
  const policy = getPublishedPageAccessPolicy(page);
  if (policy.kind === "public") {
    return true;
  }

  if (!viewer.isTeamMember) {
    return false;
  }

  return canAccessPagePolicy(policy, viewer.audienceIds);
}

export async function getAccessiblePublishedPages(
  ctx: QueryCtx,
  site: Doc<"sites">,
  sessionTokens?: string[],
): Promise<PageForAccess[]> {
  if (!site.isPublished) {
    return [];
  }

  const viewer = await resolvePublishedViewerContext(ctx, site, sessionTokens);
  if (!viewer) {
    return [];
  }

  const deployedPages = (
    await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", site._id))
      .collect()
  ).filter((page) => page.isDeployed);

  const deployedPageIds = new Set(deployedPages.map((page) => page._id));
  const childrenByParent = new Map<string, PageForAccess[]>();

  for (const page of deployedPages) {
    const parentId =
      (page.publishedParentId ?? page.parentId) &&
      deployedPageIds.has(
        (page.publishedParentId ?? page.parentId) as Id<"pages">,
      )
        ? (page.publishedParentId ?? page.parentId)
        : undefined;
    const key = parentId ?? "__root__";
    const existingChildren = childrenByParent.get(key);
    if (existingChildren) {
      existingChildren.push(page);
    } else {
      childrenByParent.set(key, [page]);
    }
  }

  for (const children of childrenByParent.values()) {
    children.sort(
      (a, b) => (a.publishedOrder ?? a.order) - (b.publishedOrder ?? b.order),
    );
  }

  const accessiblePages: PageForAccess[] = [];

  const visit = (parentId?: Id<"pages">) => {
    const key = parentId ?? "__root__";
    const children = childrenByParent.get(key) ?? [];
    for (const child of children) {
      if (!canViewerAccessPublishedPage(child, viewer)) {
        continue;
      }
      accessiblePages.push(child);
      visit(child._id);
    }
  };

  visit();

  return accessiblePages;
}

export async function canViewerAccessPublishedPageById(
  ctx: QueryCtx,
  pageId: Id<"pages">,
  sessionTokens?: string[],
): Promise<boolean> {
  const page = await ctx.db.get(pageId);
  if (!page || !page.isDeployed) {
    return false;
  }

  const site = await ctx.db.get(page.siteId);
  if (!site) {
    return false;
  }

  const accessiblePages = await getAccessiblePublishedPages(
    ctx,
    site,
    sessionTokens,
  );

  return accessiblePages.some(
    (accessiblePage) => accessiblePage._id === pageId,
  );
}
