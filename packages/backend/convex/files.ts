import {
  isSupportedUploadMimeType,
  keyMatchesPurpose,
  parseFileKey,
  resolveUploadMimeType,
} from "@baseblocks/domain";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  type MutationCtx,
  mutation,
  query,
  type QueryCtx,
} from "./_generated/server";
import { getActiveLibraryIds, resolveSiteContext } from "./model/sites";
import {
  checkOrganizationPermission,
  requireOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";
import { canAccessPublishedSite } from "./sharing";

export function buildFileUrl(fileId: Id<"files">): string {
  return `/api/files/${fileId}`;
}

export function normalizeFileSearchMetadata(file: Doc<"files">) {
  return {
    fileId: file._id,
    filename: file.filename,
    fileContentType: file.contentType,
    size: file.size,
    libraryId: file.libraryId,
    downloadUrl: buildFileUrl(file._id),
  };
}

export async function deleteFileRows(
  ctx: MutationCtx,
  file: Doc<"files">,
): Promise<void> {
  const searchEntry = await ctx.db
    .query("searchEntries")
    .withIndex("by_source", (q) =>
      q.eq("kind", "file").eq("sourceId", file._id),
    )
    .first();
  if (searchEntry) await ctx.db.delete(searchEntry._id);
  await ctx.db.delete(file._id);
}

function isUploadedFile(file: Doc<"files">) {
  return file.kind === "file";
}

function mapFile(file: Doc<"files">) {
  return {
    ...file,
    filename: file.filename ?? "file",
    downloadUrl: buildFileUrl(file._id),
  };
}

async function isReferencedFile(ctx: QueryCtx, file: Doc<"files">) {
  const references = await ctx.db
    .query("pageReferences")
    .withIndex("by_site", (q) => q.eq("siteId", file.siteId))
    .collect();
  return references.some((reference) => reference.fileIds.includes(file._id));
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
    return checkOrganizationPermission(ctx, site.organizationId, {
      resource: purpose === "file" ? "library" : "site",
      action: "manage",
    });
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
    await requireOrganizationMember(ctx, site.organizationId);
    return mapFile(file);
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
    if (!site || !canAccessPublishedSite(site)) return null;
    if (file.kind === "siteAsset") {
      return file.visibility === "public" ? file : null;
    }
    if (file.libraryId) {
      const activeLibraryIds = await getActiveLibraryIds(ctx, file.siteId);
      if (!activeLibraryIds.has(file.libraryId)) return null;
    } else if (!(await isReferencedFile(ctx, file))) {
      return null;
    }
    return file;
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
    if (file.kind === "siteAsset") {
      const canManage = await checkOrganizationPermission(
        ctx,
        site.organizationId,
        { resource: "site", action: "manage" },
      );
      return canManage ? file : null;
    }
    await requireOrganizationMember(ctx, site.organizationId);
    return file;
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
  const legacyOrder = Number.MAX_SAFE_INTEGER / 2;
  const order =
    [...folderSiblings, ...fileSiblings].reduce(
      (maximum, sibling, index) =>
        Math.max(maximum, sibling.order ?? legacyOrder + index),
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
  await ctx.db.insert("searchEntries", {
    siteId: args.siteId,
    kind: "file",
    sourceId: fileId,
    title: args.filename,
    text: args.filename,
    updatedAt: createdAt,
  });
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
    const site = await resolveSiteContext(ctx, args.siteId);
    if (!site) throw new ConvexError("Site not found");
    const { auth } = await requireOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "library", action: "manage" },
    );
    if (args.libraryId) {
      const library = await ctx.db.get(args.libraryId);
      if (!library || library.siteId !== args.siteId) {
        throw new ConvexError("Library not found");
      }
    }
    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder || folder.libraryId !== args.libraryId) {
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
    if (!file || !isUploadedFile(file)) throw new ConvexError("File not found");
    const site = await resolveSiteContext(ctx, file.siteId);
    if (!site) throw new ConvexError("Site not found");
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "library",
      action: "manage",
    });
    await ctx.db.patch(fileId, { filename });
    const entry = await ctx.db
      .query("searchEntries")
      .withIndex("by_source", (q) =>
        q.eq("kind", "file").eq("sourceId", fileId),
      )
      .first();
    if (entry) {
      await ctx.db.patch(entry._id, {
        title: filename,
        text: filename,
        updatedAt: Date.now(),
      });
    }
    return fileId;
  },
});

export const remove = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, { fileId }) => {
    const file = await ctx.db.get(fileId);
    if (!file || !isUploadedFile(file)) throw new ConvexError("File not found");
    const site = await resolveSiteContext(ctx, file.siteId);
    if (!site) throw new ConvexError("Site not found");
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "library",
      action: "manage",
    });
    await deleteFileRows(ctx, file);
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
    const site = await resolveSiteContext(ctx, args.siteId);
    if (!site) throw new ConvexError("Site not found");
    const { auth } = await requireOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "site", action: "manage" },
    );
    const fileId = await ctx.db.insert("files", {
      siteId: args.siteId,
      kind: "siteAsset",
      visibility: "public",
      objectKey: args.objectKey,
      filename: args.filename,
      contentType,
      size: args.size,
      checksum: args.checksum,
      uploadedBy: auth.userId,
      createdAt: Date.now(),
    });
    return { fileId, url: buildFileUrl(fileId) };
  },
});
