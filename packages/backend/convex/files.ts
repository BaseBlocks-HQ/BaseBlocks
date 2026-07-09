// Flattened Convex domain module. Keep this file as the public API for this domain.
import { type FunctionReference, makeFunctionReference } from "convex/server";
import { ConvexError, v } from "convex/values";
import {
  isSupportedUploadMimeType,
  parseFileKey,
  resolveUploadMimeType,
} from "@baseblocks/domain";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { checkTeamCapability, requireSiteManager } from "./permissions";
import { canAccessPublishedSite } from "./sharing";
import { resolveSiteContext } from "./sites";

export function buildAssetUrl(assetId: Id<"assets">): string {
  return `/api/storage/assets/${assetId}`;
}

export function buildDocumentDownloadUrl(documentId: Id<"documents">): string {
  return `/api/storage/documents/${documentId}`;
}

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

function validateSiteAssetUpload(args: {
  siteId: string;
  objectKey: string;
  contentType: string;
  size: number;
}): string {
  const parsed = parseFileKey(args.objectKey);
  if (!parsed || parsed.siteId !== args.siteId || parsed.kind !== "assets") {
    throw new ConvexError("Invalid asset key");
  }

  const contentType = resolveUploadMimeType({
    filename: parsed.filename,
    contentType: args.contentType,
  });

  if (!isSupportedUploadMimeType(contentType)) {
    throw new ConvexError("File type not allowed");
  }

  const maxUploadSize = getFilesMaxUploadSize();
  if (maxUploadSize !== null && args.size > maxUploadSize) {
    throw new ConvexError("File is too large");
  }

  return contentType;
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
    const normalizedContentType = validateSiteAssetUpload({
      siteId,
      objectKey,
      contentType,
      size,
    });

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
      contentType: normalizedContentType,
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

export function requireFilesEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export function getFilesBucketName(): string {
  return requireFilesEnv("FILES_BUCKET");
}

export function getFilesProviderName(): string {
  return process.env.FILES_ADAPTER?.trim() || "s3";
}

export function getFilesMaxUploadSize(): number | null {
  const raw = process.env.FILES_MAX_UPLOAD_SIZE_BYTES?.trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error("FILES_MAX_UPLOAD_SIZE_BYTES must be a positive integer");
  }
  return parsed;
}

type DeleteObjectArgs = { objectKey: string };
type DeleteObjectResult = { deleted: boolean };

export const deleteObjectAction = makeFunctionReference<
  "action",
  DeleteObjectArgs,
  DeleteObjectResult
>("filesNode:deleteObject") as unknown as FunctionReference<
  "action",
  "internal",
  DeleteObjectArgs,
  DeleteObjectResult
>;
