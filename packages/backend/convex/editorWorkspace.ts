import { v } from "convex/values";
import { query } from "./_generated/server";
import { isOrganizationMember } from "./permissions";

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

    const pages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    return {
      site,
      pages: pages.filter((page) => page.deletedAt === undefined),
    };
  },
});
