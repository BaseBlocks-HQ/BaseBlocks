import { v } from "convex/values";
import { query } from "../_generated/server";
import { checkTeamCapability } from "../auth";
import { canAccessPublishedSite } from "../sharing/access";

export const canUploadToSite = query({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) {
      return false;
    }

    return checkTeamCapability(ctx, site.teamId, "canManageSites");
  },
});

export const getPublicAsset = query({
  args: {
    assetId: v.id("assets"),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { assetId, sessionTokens }) => {
    const asset = await ctx.db.get(assetId);
    if (!asset || asset.visibility !== "public") {
      return null;
    }

    const site = await ctx.db.get(asset.siteId);
    if (!site || !(await canAccessPublishedSite(ctx, site, sessionTokens))) {
      return null;
    }

    return asset;
  },
});

export const getAuthorizedAsset = query({
  args: {
    assetId: v.id("assets"),
  },
  handler: async (ctx, { assetId }) => {
    const asset = await ctx.db.get(assetId);
    if (!asset) {
      return null;
    }

    const site = await ctx.db.get(asset.siteId);
    if (!site) {
      return null;
    }

    const canManageSites = await checkTeamCapability(
      ctx,
      site.teamId,
      "canManageSites",
    );
    return canManageSites ? asset : null;
  },
});
