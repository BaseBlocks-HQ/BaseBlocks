import { v } from "convex/values";
import { query } from "../_generated/server";
import { checkIsMember } from "../auth";

/**
 * List deployment history for a site (most recent first, authenticated)
 */
export const list = query({
  args: {
    siteId: v.id("sites"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { siteId, limit = 20 }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return [];

    if (!(await checkIsMember(ctx, site.teamId))) return [];

    const deployments = await ctx.db
      .query("deployments")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    // Sort by version descending (most recent first)
    deployments.sort((a, b) => b.version - a.version);

    return deployments.slice(0, limit);
  },
});

/**
 * Get current active deployment for a site (authenticated)
 */
export const getCurrent = query({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return null;

    if (!(await checkIsMember(ctx, site.teamId))) return null;

    return await ctx.db
      .query("deployments")
      .withIndex("by_site_status", (q) =>
        q.eq("siteId", siteId).eq("status", "active"),
      )
      .first();
  },
});

/**
 * Get deployment with its snapshot details (for rollback preview, authenticated)
 */
export const getWithSnapshot = query({
  args: {
    deploymentId: v.id("deployments"),
  },
  handler: async (ctx, { deploymentId }) => {
    const deployment = await ctx.db.get(deploymentId);
    if (!deployment) return null;

    const site = await ctx.db.get(deployment.siteId);
    if (!site) return null;

    if (!(await checkIsMember(ctx, site.teamId))) return null;

    const snapshots = await ctx.db
      .query("deploymentSnapshots")
      .withIndex("by_deployment", (q) => q.eq("deploymentId", deploymentId))
      .collect();

    return {
      deployment,
      snapshots: snapshots.map((s) => ({
        chunkType: s.chunkType,
        pageId: s.pageId,
      })),
    };
  },
});
