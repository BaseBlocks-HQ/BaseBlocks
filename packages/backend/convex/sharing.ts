import type { GenericQueryCtx } from "convex/server";
import { v } from "convex/values";
import type { DataModel, Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireOrganizationPermission } from "./permissions";

type QueryCtx = GenericQueryCtx<DataModel>;

function normalizeVisibility(
  visibility: Doc<"sites">["visibility"],
): "public" | "private" {
  return visibility === "public" || visibility === "link-only"
    ? "public"
    : "private";
}

export function canAccessPublishedSite(site: Doc<"sites">): boolean {
  return site.isPublished && normalizeVisibility(site.visibility) === "public";
}

export async function getAccessiblePublishedPages(
  ctx: QueryCtx,
  site: Doc<"sites">,
): Promise<Doc<"pages">[]> {
  if (!canAccessPublishedSite(site)) return [];
  return ctx.db
    .query("pages")
    .withIndex("by_site", (q) => q.eq("siteId", site._id))
    .collect();
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
    return { visibility: normalizeVisibility(site.visibility) };
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
    const codes = await ctx.db
      .query("siteAccessCodes")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
    for (const code of codes) await ctx.db.delete(code._id);
    const sessions = await ctx.db
      .query("siteAccessSessions")
      .withIndex("by_site_token", (q) => q.eq("siteId", siteId))
      .collect();
    for (const session of sessions) await ctx.db.delete(session._id);
    return siteId;
  },
});
