import { v } from "convex/values";
import { query } from "./_generated/server";
import { isOrganizationMember } from "./permissions";
import type { Doc, Id } from "./_generated/dataModel";

export function draftRestoreView(
  restoreId: Id<"draftRestores">,
  restore: Doc<"draftRestores"> | null,
) {
  return restore
    ? {
        _id: restore._id,
        status: restore.status,
        failure: restore.failure,
      }
    : {
        _id: restoreId,
        status: "orphaned" as const,
        failure:
          "The draft restore state is missing. The draft remains locked to avoid exposing partial data. Contact support to recover it.",
      };
}

/**
 * The editor shell and canvas are one reactive surface, so they subscribe to
 * one atomic workspace snapshot. This avoids sibling components independently
 * loading (and briefly disagreeing about) the same site and page collection.
 */
export const get = query({
  args: { organizationId: v.string(), siteId: v.id("sites") },
  handler: async (ctx, { organizationId, siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site || site.organizationId !== organizationId) return null;
    if (!(await isOrganizationMember(ctx, site.organizationId))) return null;

    if (site.activeDraftRestoreId) {
      const restore = await ctx.db.get(site.activeDraftRestoreId);
      return {
        site,
        pages: [],
        restore: draftRestoreView(site.activeDraftRestoreId, restore),
      };
    }

    const pages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    return {
      site,
      pages: pages.filter((page) => page.deletedAt === undefined),
      restore: null,
    };
  },
});
