import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import {
  getAuthContextOrNull,
  isOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";
import { refreshPublicationState } from "./model/publication";

export type PublishedSiteAccess =
  | { kind: "unpublished" }
  | { kind: "public" }
  | { kind: "private-member" }
  | { kind: "authentication-required" }
  | { kind: "forbidden" };

export function isPubliclyPublishedSite(site: Doc<"sites">): boolean {
  return site.isPublished && site.visibility === "public";
}

export function canRenderPublishedSite(access: PublishedSiteAccess): boolean {
  return access.kind === "public" || access.kind === "private-member";
}

export function classifyPublishedSiteAccess(
  site: Pick<Doc<"sites">, "isPublished" | "visibility">,
  identity: { isAuthenticated: boolean; isMember: boolean },
): PublishedSiteAccess {
  if (!site.isPublished) return { kind: "unpublished" };
  if (site.visibility === "public") return { kind: "public" };
  if (!identity.isAuthenticated) return { kind: "authentication-required" };
  return identity.isMember ? { kind: "private-member" } : { kind: "forbidden" };
}

export async function resolvePublishedSiteAccess(
  ctx: QueryCtx,
  site: Doc<"sites">,
): Promise<PublishedSiteAccess> {
  if (!site.isPublished || site.visibility === "public") {
    return classifyPublishedSiteAccess(site, {
      isAuthenticated: false,
      isMember: false,
    });
  }

  const auth = await getAuthContextOrNull(ctx);
  const isMember = auth
    ? await isOrganizationMember(ctx, site.organizationId)
    : false;
  return classifyPublishedSiteAccess(site, {
    isAuthenticated: auth !== null,
    isMember,
  });
}

export const getSettings = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "site",
      action: "manage",
    });
    return { visibility: site.visibility };
  },
});

export const updateVisibility = mutation({
  args: {
    siteId: v.id("sites"),
    visibility: v.union(v.literal("private"), v.literal("public")),
  },
  handler: async (ctx, { siteId, visibility }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "site",
      action: "manage",
    });
    await ctx.db.patch(siteId, { visibility, updatedAt: Date.now() });
    await refreshPublicationState(ctx, siteId);
    return siteId;
  },
});
