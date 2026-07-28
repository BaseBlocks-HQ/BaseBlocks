import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireOrganizationPermission } from "./permissions";
import { refreshPublicationState } from "./model/publication";

export function canAccessPublishedSite(site: Doc<"sites">): boolean {
  return site.isPublished && site.visibility === "public";
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
