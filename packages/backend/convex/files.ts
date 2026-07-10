import { ConvexError, v } from "convex/values";
import {
  isSupportedUploadMimeType,
  parseFileKey,
  resolveUploadMimeType,
} from "@baseblocks/domain";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  checkOrganizationPermission,
  requireOrganizationPermission,
} from "./permissions";
import { canAccessPublishedSite } from "./sharing";
import { resolveSiteContext } from "./sites";

export function buildAssetUrl(fileId: Id<"files">): string {
  return `/api/storage/assets/${fileId}`;
}

export function buildDocumentDownloadUrl(documentId: Id<"documents">): string {
  return `/api/storage/documents/${documentId}`;
}

export const canUploadToSite = query({
  args: {
    siteId: v.id("sites"),
    purpose: v.union(v.literal("document"), v.literal("siteAsset")),
  },
  returns: v.boolean(),
  handler: async (ctx, { siteId, purpose }) => {
    const site = await ctx.db.get(siteId);
    if (!site) {
      return false;
    }

    return checkOrganizationPermission(ctx, site.organizationId, {
      resource: purpose === "document" ? "library" : "site",
      action: "manage",
    });
  },
});

export const getPublicAsset = query({
  args: {
    fileId: v.id("files"),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { fileId, sessionTokens }) => {
    const asset = await ctx.db.get(fileId);
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
    fileId: v.id("files"),
  },
  handler: async (ctx, { fileId }) => {
    const asset = await ctx.db.get(fileId);
    if (!asset) {
      return null;
    }

    const site = await ctx.db.get(asset.siteId);
    if (!site) {
      return null;
    }

    const canManageSites = await checkOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "site", action: "manage" },
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

    const { auth } = await requireOrganizationPermission(
      ctx,
      siteCtx.organizationId,
      { resource: "site", action: "manage" },
    );

    const fileId = await ctx.db.insert("files", {
      siteId,
      kind: "siteAsset",
      visibility: "public",
      objectKey,
      filename,
      contentType: normalizedContentType,
      size,
      checksum,
      uploadedBy: auth.userId,
      createdAt: Date.now(),
    });

    return {
      fileId,
      url: buildAssetUrl(fileId),
    };
  },
});
