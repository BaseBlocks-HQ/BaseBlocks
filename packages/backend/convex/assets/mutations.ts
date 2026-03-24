import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAdmin } from "../auth";
import { resolveSiteContext } from "../lib/resolvers";
import { getStorageBucketName } from "../storage/config";
import { buildAssetUrl } from "../storage/paths";

export const createSiteAsset = mutation({
  args: {
    siteId: v.id("sites"),
    objectKey: v.string(),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
    checksum: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { siteId, objectKey, filename, contentType, size, checksum },
  ) => {
    const siteCtx = await resolveSiteContext(ctx, siteId);
    if (!siteCtx) {
      throw new ConvexError("Site not found");
    }

    const { auth } = await requireAdmin(ctx, siteCtx.teamId);

    const assetId = await ctx.db.insert("assets", {
      siteId,
      kind: "siteAsset",
      visibility: "public",
      provider: "s3",
      bucket: getStorageBucketName(),
      objectKey,
      filename,
      contentType,
      size,
      checksum,
      uploadedBy: auth.userId,
      createdAt: Date.now(),
    });

    return {
      assetId,
      url: buildAssetUrl(assetId),
    };
  },
});
