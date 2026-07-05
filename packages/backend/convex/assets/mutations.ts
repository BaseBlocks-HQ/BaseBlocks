import { isSupportedUploadMimeType } from "@baseblocks/types";
import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireSiteManager } from "../auth";
import {
  getFilesBucketName,
  getFilesMaxUploadSize,
  getFilesProviderName,
} from "../files/config";
import { parseFileKey } from "../files/keys";
import { resolveSiteContext } from "../lib/resolvers";
import { buildAssetUrl } from "./urls";

function validateSiteAssetUpload(args: {
  siteId: string;
  objectKey: string;
  contentType: string;
  size: number;
}) {
  const parsed = parseFileKey(args.objectKey);
  if (
    !parsed ||
    parsed.siteId !== args.siteId ||
    parsed.kind !== "assets"
  ) {
    throw new ConvexError("Invalid asset key");
  }

  if (!isSupportedUploadMimeType(args.contentType)) {
    throw new ConvexError("File type not allowed");
  }

  const maxUploadSize = getFilesMaxUploadSize();
  if (maxUploadSize !== null && args.size > maxUploadSize) {
    throw new ConvexError("File is too large");
  }
}

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
    validateSiteAssetUpload({ siteId, objectKey, contentType, size });

    const siteCtx = await resolveSiteContext(ctx, siteId);
    if (!siteCtx) {
      throw new ConvexError("Site not found");
    }

    const { auth } = await requireSiteManager(ctx, siteCtx.teamId);

    const assetId = await ctx.db.insert("assets", {
      siteId,
      kind: "siteAsset",
      visibility: "public",
      provider: getFilesProviderName(),
      bucket: getFilesBucketName(),
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
