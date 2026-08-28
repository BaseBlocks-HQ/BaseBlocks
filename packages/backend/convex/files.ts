import {
  isSupportedUploadMimeType,
  keyMatchesPurpose,
  managedFilePath,
  parseFileKey,
  resolveUploadMimeType,
} from "@baseblocks/domain";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import {
  checkOrganizationPermission,
  getPageAccessOrNull,
  isOrganizationMember,
  requireOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";
import { isPubliclyPublishedSite } from "./sharing";
import { assertDraftReadable, touchSiteDraft } from "./model/draft";
import { cancelFileExtraction, queueFileExtraction } from "./fileExtraction";
import {
  draftSearchScope,
  removeSearchEntry,
  upsertDraftFileSearch,
} from "./search";
import { recordStorageUsageEvent } from "./model/storageTelemetry";
import { pendingSiteAssetLifecycle } from "./model/siteAssets";
import { isReleaseAvailable } from "./model/releaseState";

async function isFileReferencedByAccessiblePage(
  ctx: Parameters<typeof getPageAccessOrNull>[0],
  file: Doc<"files">,
): Promise<boolean> {
  const documents = await ctx.db
    .query("pageDocuments")
    .withIndex("by_site", (q) => q.eq("siteId", file.siteId))
    .collect();
  for (const document of documents) {
    const revision = await ctx.db.get(document.revisionId);
    if (!revision?.fileIds.includes(file._id)) continue;
    if (await getPageAccessOrNull(ctx, document.pageId)) return true;
  }
  return false;
}

export function buildFileUrl(fileId: Id<"files">): string {
  return managedFilePath(fileId);
}

export async function deleteFileRows(
  ctx: MutationCtx,
  file: Doc<"files">,
): Promise<void> {
  const site = await ctx.db.get(file.siteId);
  const deletedAt = Date.now();
  if (site && file.deletedAt === undefined) {
    await recordStorageUsageEvent(ctx, {
      organizationId: site.organizationId,
      siteId: site._id,
      fileId: file._id,
      kind: "softDelete",
      bytes: file.size,
      idempotencyKey: `file:delete:${file._id}:${deletedAt}`,
      now: deletedAt,
    });
  }
  await removeSearchEntry(ctx, draftSearchScope(file.siteId), "file", file._id);
  await cancelFileExtraction(ctx, file._id);
  await ctx.db.patch(file._id, { deletedAt });
}

function isUploadedFile(file: Doc<"files">) {
  return file.kind === "file";
}

function mapFile(file: Doc<"files">) {
  return {
    ...file,
    downloadUrl: buildFileUrl(file._id),
  };
}

export const canUploadToSite = query({
  args: {
    siteId: v.id("sites"),
    purpose: v.union(v.literal("file"), v.literal("siteAsset")),
  },
  returns: v.boolean(),
  handler: async (ctx, { siteId, purpose }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return false;
    const permitted = await checkOrganizationPermission(
      ctx,
      site.organizationId,
      {
        resource: purpose === "file" ? "library" : "site",
        action: "manage",
      },
    );
    return permitted && !site.activeDraftRestoreId;
  },
});

export const get = query({
  args: { fileId: v.string() },
  handler: async (ctx, { fileId }) => {
    const id = ctx.db.normalizeId("files", fileId);
    if (!id) return null;
    const file = await ctx.db.get(id);
    if (!file || !isUploadedFile(file)) return null;
    const site = await ctx.db.get(file.siteId);
    if (!site) return null;
    const isMember = await isOrganizationMember(ctx, site.organizationId);
    const isGuestReference = isMember
      ? false
      : await isFileReferencedByAccessiblePage(ctx, file);
    if (!isMember && !isGuestReference) return null;
    assertDraftReadable(site);
    if (file.deletedAt !== undefined) return null;
    return mapFile(file);
  },
});

export const resolveSiteAsset = query({
  args: { siteId: v.id("sites"), fileId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      imageId: v.id("files"),
      url: v.string(),
    }),
  ),
  handler: async (ctx, { siteId, fileId }) => {
    const id = ctx.db.normalizeId("files", fileId);
    if (!id) return null;
    const file = await ctx.db.get(id);
    if (
      !file ||
      file.siteId !== siteId ||
      file.kind !== "siteAsset" ||
      file.deletedAt !== undefined
    ) {
      return null;
    }
    const site = await ctx.db.get(siteId);
    if (!site) return null;
    const isMember = await isOrganizationMember(ctx, site.organizationId);
    const isGuestReference = isMember
      ? false
      : await isFileReferencedByAccessiblePage(ctx, file);
    if (!isMember && !isGuestReference) return null;
    assertDraftReadable(site);
    return { imageId: file._id, url: buildFileUrl(file._id) };
  },
});

export const getDownloadAsset = query({
  args: { fileId: v.string() },
  handler: async (ctx, { fileId }) => {
    const id = ctx.db.normalizeId("files", fileId);
    if (!id) return null;
    const file = await ctx.db.get(id);
    if (!file || !isUploadedFile(file)) return null;
    const site = await ctx.db.get(file.siteId);
    if (!site) return null;
    await requireOrganizationMember(ctx, site.organizationId);
    assertDraftReadable(site);
    if (file.deletedAt !== undefined) return null;
    return file;
  },
});

export const getPublic = query({
  args: { fileId: v.string() },
  handler: async (ctx, { fileId }) => {
    const id = ctx.db.normalizeId("files", fileId);
    if (!id) return null;
    const file = await ctx.db.get(id);
    if (!file) return null;
    const site = await ctx.db.get(file.siteId);
    if (!site?.liveReleaseId || !isPubliclyPublishedSite(site)) return null;
    const release = await ctx.db.get(site.liveReleaseId);
    if (!release || !isReleaseAvailable(release)) return null;
    const snapshot = await ctx.db
      .query("releaseFiles")
      .withIndex("by_release_file", (q) =>
        q.eq("releaseId", release._id).eq("fileId", file._id),
      )
      .unique();
    return snapshot
      ? {
          objectKey: snapshot.objectKey,
          filename: snapshot.filename,
          contentType: snapshot.contentType,
          size: snapshot.size,
        }
      : null;
  },
});

export const getAuthorized = query({
  args: { fileId: v.string() },
  handler: async (ctx, { fileId }) => {
    const id = ctx.db.normalizeId("files", fileId);
    if (!id) return null;
    const file = await ctx.db.get(id);
    if (!file) return null;
    const site = await ctx.db.get(file.siteId);
    if (!site) return null;
    const liveRelease = site.liveReleaseId
      ? await ctx.db.get(site.liveReleaseId)
      : null;
    const released =
      liveRelease &&
      isReleaseAvailable(liveRelease) &&
      (await ctx.db
        .query("releaseFiles")
        .withIndex("by_release_file", (q) =>
          q.eq("releaseId", liveRelease._id).eq("fileId", file._id),
        )
        .unique());
    if (file.kind === "siteAsset") {
      const canManage = await checkOrganizationPermission(
        ctx,
        site.organizationId,
        { resource: "site", action: "manage" },
      );
      const guestReference = canManage
        ? false
        : await isFileReferencedByAccessiblePage(ctx, file);
      if (!canManage && !guestReference) return null;
      if (site.visibility === "public" && !canManage && !released) {
        return null;
      }
      if (!released) assertDraftReadable(site);
      return released
        ? {
            objectKey: released.objectKey,
            filename: released.filename,
            contentType: released.contentType,
            size: released.size,
          }
        : file.deletedAt === undefined
          ? file
          : null;
    }
    const member = await isOrganizationMember(ctx, site.organizationId);
    if (!member && !(await isFileReferencedByAccessiblePage(ctx, file))) {
      return null;
    }
    if (site.visibility === "public" && !member && !released) return null;
    if (!released) assertDraftReadable(site);
    return released
      ? {
          objectKey: released.objectKey,
          filename: released.filename,
          contentType: released.contentType,
          size: released.size,
        }
      : file.deletedAt === undefined
        ? file
        : null;
  },
});

function validateUpload(args: {
  siteId: string;
  objectKey: string;
  filename: string;
  contentType: string;
  purpose: "file" | "siteAsset";
}) {
  if (
    !keyMatchesPurpose({
      key: args.objectKey,
      siteId: args.siteId,
      purpose: args.purpose,
    })
  ) {
    throw new ConvexError("Invalid file key");
  }
  const parsed = parseFileKey(args.objectKey);
  const contentType = resolveUploadMimeType({
    filename: parsed?.filename ?? args.filename,
    contentType: args.contentType,
  });
  if (!isSupportedUploadMimeType(contentType)) {
    throw new ConvexError("File type not allowed");
  }
  return contentType;
}

async function createUploadedFile(
  ctx: MutationCtx,
  args: {
    siteId: Id<"sites">;
    uploadedBy: string;
    objectKey: string;
    filename: string;
    contentType: string;
    size: number;
    checksum?: string;
    libraryId?: Id<"documentLibraries">;
    folderId?: Id<"documentFolders">;
  },
) {
  const createdAt = Date.now();
  const [folderSiblings, fileSiblings] = args.libraryId
    ? await Promise.all([
        ctx.db
          .query("documentFolders")
          .withIndex("by_parent", (q) =>
            q.eq("libraryId", args.libraryId!).eq("parentId", args.folderId),
          )
          .collect(),
        ctx.db
          .query("files")
          .withIndex("by_folder", (q) =>
            q.eq("libraryId", args.libraryId!).eq("folderId", args.folderId),
          )
          .collect(),
      ])
    : [[], []];
  const order =
    [...folderSiblings, ...fileSiblings].reduce(
      (maximum, sibling) => Math.max(maximum, sibling.order),
      -1,
    ) + 1;
  const fileId = await ctx.db.insert("files", {
    siteId: args.siteId,
    kind: "file",
    visibility: "private",
    objectKey: args.objectKey,
    filename: args.filename,
    contentType: args.contentType,
    size: args.size,
    checksum: args.checksum,
    libraryId: args.libraryId,
    folderId: args.folderId,
    order,
    uploadedBy: args.uploadedBy,
    createdAt,
  });
  const site = await ctx.db.get(args.siteId);
  if (!site) throw new Error("Site disappeared while recording upload");
  await recordStorageUsageEvent(ctx, {
    organizationId: site.organizationId,
    siteId: site._id,
    actorId: args.uploadedBy,
    fileId,
    kind: "upload",
    bytes: args.size,
    idempotencyKey: `file:upload:${fileId}`,
    now: createdAt,
  });
  const file = await ctx.db.get(fileId);
  if (file) {
    await upsertDraftFileSearch(ctx, file, "");
    await queueFileExtraction(ctx, file);
  }
  await touchSiteDraft(ctx, args.siteId, createdAt, [
    { entityType: "file", entityId: fileId },
  ]);
  return fileId;
}

export const create = mutation({
  args: {
    siteId: v.id("sites"),
    objectKey: v.string(),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
    checksum: v.optional(v.string()),
    libraryId: v.optional(v.id("documentLibraries")),
    folderId: v.optional(v.id("documentFolders")),
  },
  handler: async (ctx, args) => {
    const contentType = validateUpload({ ...args, purpose: "file" });
    const site = await ctx.db.get(args.siteId);
    if (!site) throw new ConvexError("Site not found");
    const { auth } = await requireOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "library", action: "manage" },
    );
    if (args.libraryId) {
      const library = await ctx.db.get(args.libraryId);
      if (
        !library ||
        library.siteId !== args.siteId ||
        library.deletedAt !== undefined
      ) {
        throw new ConvexError("Library not found");
      }
    }
    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (
        !folder ||
        folder.libraryId !== args.libraryId ||
        folder.deletedAt !== undefined
      ) {
        throw new ConvexError("Folder not found");
      }
    }
    return createUploadedFile(ctx, {
      ...args,
      contentType,
      uploadedBy: auth.userId,
    });
  },
});

export const rename = mutation({
  args: { fileId: v.id("files"), filename: v.string() },
  handler: async (ctx, { fileId, filename }) => {
    const file = await ctx.db.get(fileId);
    if (!file || !isUploadedFile(file) || file.deletedAt !== undefined) {
      throw new ConvexError("File not found");
    }
    const site = await ctx.db.get(file.siteId);
    if (!site) throw new ConvexError("Site not found");
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "library",
      action: "manage",
    });
    await ctx.db.patch(fileId, { filename });
    await touchSiteDraft(ctx, file.siteId, Date.now(), [
      { entityType: "file", entityId: fileId },
    ]);
    const extraction = await ctx.db
      .query("fileExtractions")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .first();
    await upsertDraftFileSearch(
      ctx,
      { ...file, filename },
      extraction?.status === "ready" ? (extraction.extractedText ?? "") : "",
    );
    return fileId;
  },
});

export const remove = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, { fileId }) => {
    const file = await ctx.db.get(fileId);
    if (!file || !isUploadedFile(file) || file.deletedAt !== undefined) {
      throw new ConvexError("File not found");
    }
    const site = await ctx.db.get(file.siteId);
    if (!site) throw new ConvexError("Site not found");
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "library",
      action: "manage",
    });
    await deleteFileRows(ctx, file);
    await touchSiteDraft(ctx, file.siteId, Date.now(), [
      { entityType: "file", entityId: fileId },
    ]);
  },
});

export const createSiteAsset = mutation({
  args: {
    siteId: v.id("sites"),
    objectKey: v.string(),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
    checksum: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const contentType = validateUpload({ ...args, purpose: "siteAsset" });
    const site = await ctx.db.get(args.siteId);
    if (!site) throw new ConvexError("Site not found");
    const { auth } = await requireOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "site", action: "manage" },
    );
    const createdAt = Date.now();
    const fileId = await ctx.db.insert("files", {
      siteId: args.siteId,
      kind: "siteAsset",
      visibility: "public",
      objectKey: args.objectKey,
      filename: args.filename,
      contentType,
      size: args.size,
      checksum: args.checksum,
      order: 0,
      uploadedBy: auth.userId,
      createdAt,
      ...pendingSiteAssetLifecycle(createdAt),
    });
    await recordStorageUsageEvent(ctx, {
      organizationId: site.organizationId,
      siteId: site._id,
      actorId: auth.userId,
      fileId,
      kind: "upload",
      bytes: args.size,
      idempotencyKey: `file:upload:${fileId}`,
    });
    return { fileId, url: buildFileUrl(fileId) };
  },
});
