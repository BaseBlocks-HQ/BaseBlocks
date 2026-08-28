import { planTreeMove } from "@baseblocks/domain";
import { v } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { query, mutation } from "./_generated/server";
import {
  isOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";
import { buildFileUrl, deleteFileRows } from "./files";
import { canRenderPublishedSite, resolvePublishedSiteAccess } from "./sharing";
import {
  requireFolderManagement,
  requireLibraryManagement,
} from "./model/libraryAccess";
import { assertDraftReadable, touchSiteDraft } from "./model/draft";

const librarySummary = v.object({
  _id: v.id("documentLibraries"),
  name: v.string(),
  siteId: v.id("sites"),
});

const librarySiteSummary = v.object({
  _id: v.id("sites"),
  name: v.string(),
  organizationId: v.string(),
});

const libraryFolderSummary = v.object({
  _id: v.id("documentFolders"),
  libraryId: v.id("documentLibraries"),
  parentId: v.optional(v.id("documentFolders")),
  name: v.string(),
  order: v.number(),
});

const libraryFileSummary = v.object({
  _id: v.id("files"),
  filename: v.string(),
  contentType: v.string(),
  size: v.number(),
  downloadUrl: v.string(),
  folderId: v.optional(v.id("documentFolders")),
  order: v.number(),
  extractionStatus: v.optional(
    v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("ready"),
      v.literal("failed"),
    ),
  ),
  extractionFailure: v.optional(v.string()),
});

const explorerPayload = v.object({
  library: librarySummary,
  site: librarySiteSummary,
  folders: v.array(libraryFolderSummary),
  files: v.array(libraryFileSummary),
});

export async function buildExplorerPayload(
  ctx: QueryCtx,
  library: {
    _id: Id<"documentLibraries">;
    name: string;
    siteId: Id<"sites">;
  },
  site: {
    _id: Id<"sites">;
    name: string;
    organizationId: string;
  },
) {
  const [folders, files, extractions] = await Promise.all([
    ctx.db
      .query("documentFolders")
      .withIndex("by_parent", (q) => q.eq("libraryId", library._id))
      .collect(),
    ctx.db
      .query("files")
      .withIndex("by_folder", (q) => q.eq("libraryId", library._id))
      .collect(),
    ctx.db
      .query("fileExtractions")
      .withIndex("by_site", (q) => q.eq("siteId", site._id))
      .collect(),
  ]);
  const extractionByFileId = new Map(
    extractions.map((extraction) => [extraction.fileId, extraction]),
  );

  return {
    library: {
      _id: library._id,
      name: library.name,
      siteId: library.siteId,
    },
    site: {
      _id: site._id,
      name: site.name,
      organizationId: site.organizationId,
    },
    folders: folders
      .filter((folder) => folder.deletedAt === undefined)
      .map((folder) => ({
        _id: folder._id,
        libraryId: folder.libraryId,
        parentId: folder.parentId,
        name: folder.name,
        order: folder.order,
      }))
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
    files: files
      .filter((file) => file.deletedAt === undefined)
      .map((file) => {
        const extraction = extractionByFileId.get(file._id);
        return {
          _id: file._id,
          filename: file.filename,
          contentType: file.contentType,
          size: file.size,
          downloadUrl: buildFileUrl(file._id),
          folderId: file.folderId,
          order: file.order,
          extractionStatus: extraction?.status,
          extractionFailure: extraction?.failure?.message,
        };
      })
      .sort(
        (a, b) => a.order - b.order || a.filename.localeCompare(b.filename),
      ),
  };
}

export async function buildReleaseExplorerPayload(
  ctx: QueryCtx,
  release: {
    _id: Id<"siteReleases">;
    siteId: Id<"sites">;
    name: string;
  },
  library: {
    libraryId: Id<"documentLibraries">;
    name: string;
  },
  site: {
    organizationId: string;
  },
) {
  const [folders, files] = await Promise.all([
    ctx.db
      .query("releaseFolders")
      .withIndex("by_release_library", (q) =>
        q.eq("releaseId", release._id).eq("libraryId", library.libraryId),
      )
      .collect(),
    ctx.db
      .query("releaseFiles")
      .withIndex("by_release_library", (q) =>
        q.eq("releaseId", release._id).eq("libraryId", library.libraryId),
      )
      .collect(),
  ]);
  return {
    library: {
      _id: library.libraryId,
      name: library.name,
      siteId: release.siteId,
    },
    site: {
      _id: release.siteId,
      name: release.name,
      organizationId: site.organizationId,
    },
    folders: folders
      .map((folder) => ({
        _id: folder.folderId,
        libraryId: folder.libraryId,
        parentId: folder.parentId,
        name: folder.name,
        order: folder.order,
      }))
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
    files: files
      .filter((file) => file.kind === "file")
      .map((file) => ({
        _id: file.fileId,
        filename: file.filename,
        contentType: file.contentType,
        size: file.size,
        downloadUrl: buildFileUrl(file.fileId),
        folderId: file.folderId,
        order: file.order,
        extractionStatus: "ready" as const,
        extractionFailure: undefined,
      }))
      .sort(
        (a, b) => a.order - b.order || a.filename.localeCompare(b.filename),
      ),
  };
}

export const listLibraries = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return [];

    if (!(await isOrganizationMember(ctx, site.organizationId))) return [];
    assertDraftReadable(site);

    const libraries = await ctx.db
      .query("documentLibraries")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
    return libraries.filter((library) => library.deletedAt === undefined);
  },
});

export const getExplorer = query({
  args: { libraryId: v.id("documentLibraries") },
  returns: v.union(explorerPayload, v.null()),
  handler: async (ctx, { libraryId }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return null;

    const site = await ctx.db.get(library.siteId);
    if (!site) return null;

    if (!(await isOrganizationMember(ctx, site.organizationId))) return null;
    assertDraftReadable(site);
    if (library.deletedAt !== undefined) return null;

    return await buildExplorerPayload(ctx, library, site);
  },
});

export const getPublishedExplorer = query({
  args: { libraryId: v.id("documentLibraries") },
  returns: v.union(explorerPayload, v.null()),
  handler: async (ctx, { libraryId }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return null;

    const site = await ctx.db.get(library.siteId);
    if (!site?.liveReleaseId) return null;
    const access = await resolvePublishedSiteAccess(ctx, site);
    if (!canRenderPublishedSite(access)) return null;
    const release = await ctx.db.get(site.liveReleaseId);
    if (!release) return null;
    const releasedLibrary = await ctx.db
      .query("releaseLibraries")
      .withIndex("by_release_library", (q) =>
        q.eq("releaseId", release._id).eq("libraryId", libraryId),
      )
      .unique();
    if (!releasedLibrary) return null;
    return buildReleaseExplorerPayload(ctx, release, releasedLibrary, site);
  },
});

export const createLibrary = mutation({
  args: {
    siteId: v.id("sites"),
    name: v.string(),
  },
  handler: async (ctx, { siteId, name }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    const { auth } = await requireOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "library", action: "manage" },
    );

    const existingLibrary = await ctx.db
      .query("documentLibraries")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .filter((q) => q.eq(q.field("name"), name.trim()))
      .first();

    if (existingLibrary && existingLibrary.deletedAt === undefined) {
      throw new Error(
        `A library named "${name}" already exists. Please choose a different name.`,
      );
    }

    const now = Date.now();
    const libraryId = await ctx.db.insert("documentLibraries", {
      siteId,
      name: name.trim(),
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });
    await touchSiteDraft(ctx, siteId, now, [
      { entityType: "library", entityId: libraryId },
    ]);

    return libraryId;
  },
});

export const createFolder = mutation({
  args: {
    libraryId: v.id("documentLibraries"),
    parentId: v.optional(v.id("documentFolders")),
    name: v.string(),
  },
  handler: async (ctx, { libraryId, parentId, name }) => {
    const { auth, site } = await requireLibraryManagement(ctx, libraryId);

    if (parentId) {
      const parent = await ctx.db.get(parentId);
      if (!parent || parent.libraryId !== libraryId) {
        throw new Error("Parent folder not found");
      }
    }

    const [siblings, siblingFiles] = await Promise.all([
      ctx.db
        .query("documentFolders")
        .withIndex("by_parent", (q) =>
          q.eq("libraryId", libraryId).eq("parentId", parentId),
        )
        .collect(),
      ctx.db
        .query("files")
        .withIndex("by_folder", (q) =>
          q.eq("libraryId", libraryId).eq("folderId", parentId),
        )
        .collect(),
    ]);

    const duplicateFolder = siblings.find(
      (f) =>
        f.deletedAt === undefined &&
        f.name.toLowerCase() === name.trim().toLowerCase(),
    );
    if (duplicateFolder) {
      throw new Error(
        `A folder named "${name}" already exists in this location. Please choose a different name.`,
      );
    }

    const maxOrder = [...siblings, ...siblingFiles].reduce(
      (maximum, sibling) => Math.max(maximum, sibling.order),
      -1,
    );

    const now = Date.now();
    const folderId = await ctx.db.insert("documentFolders", {
      siteId: site._id,
      libraryId,
      parentId,
      name: name.trim(),
      order: maxOrder + 1,
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });
    await touchSiteDraft(ctx, site._id, now, [
      { entityType: "folder", entityId: folderId },
    ]);

    return folderId;
  },
});

export const updateFolder = mutation({
  args: {
    folderId: v.id("documentFolders"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { folderId, name }) => {
    const { folder, site } = await requireFolderManagement(ctx, folderId);

    if (
      name !== undefined &&
      name.trim().toLowerCase() !== folder.name.toLowerCase()
    ) {
      const siblings = await ctx.db
        .query("documentFolders")
        .withIndex("by_parent", (q) =>
          q.eq("libraryId", folder.libraryId).eq("parentId", folder.parentId),
        )
        .collect();

      const duplicateFolder = siblings.find(
        (f) =>
          f._id !== folderId &&
          f.deletedAt === undefined &&
          f.name.toLowerCase() === name.trim().toLowerCase(),
      );
      if (duplicateFolder) {
        throw new Error(
          `A folder named "${name}" already exists in this location. Please choose a different name.`,
        );
      }
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (name !== undefined) updates.name = name.trim();

    await ctx.db.patch(folderId, updates);
    await touchSiteDraft(ctx, site._id, Date.now(), [
      { entityType: "folder", entityId: folderId },
    ]);
    return folderId;
  },
});

async function deleteFolderRecursively(
  ctx: MutationCtx,
  folderId: Id<"documentFolders">,
  libraryId: Id<"documentLibraries">,
  touched: Array<
    | { entityType: "folder"; entityId: Id<"documentFolders"> }
    | { entityType: "file"; entityId: Id<"files"> }
  >,
) {
  const files = await ctx.db
    .query("files")
    .withIndex("by_folder", (q) =>
      q.eq("libraryId", libraryId).eq("folderId", folderId),
    )
    .collect();

  for (const file of files.filter((value) => value.deletedAt === undefined)) {
    await deleteFileRows(ctx, file);
    touched.push({ entityType: "file", entityId: file._id });
  }

  const children = await ctx.db
    .query("documentFolders")
    .withIndex("by_parent", (q) =>
      q.eq("libraryId", libraryId).eq("parentId", folderId),
    )
    .collect();

  for (const child of children.filter(
    (value) => value.deletedAt === undefined,
  )) {
    await deleteFolderRecursively(ctx, child._id, libraryId, touched);
  }

  await ctx.db.patch(folderId, {
    deletedAt: Date.now(),
    updatedAt: Date.now(),
  });
  touched.push({ entityType: "folder", entityId: folderId });
}

export const removeFolder = mutation({
  args: { folderId: v.id("documentFolders") },
  handler: async (ctx, { folderId }) => {
    const { folder, site } = await requireFolderManagement(ctx, folderId);

    const touched: Array<
      | { entityType: "folder"; entityId: Id<"documentFolders"> }
      | { entityType: "file"; entityId: Id<"files"> }
    > = [];
    await deleteFolderRecursively(ctx, folderId, folder.libraryId, touched);
    await touchSiteDraft(ctx, site._id, Date.now(), touched);

    return { success: true };
  },
});

export const moveInTree = mutation({
  args: {
    libraryId: v.id("documentLibraries"),
    entityId: v.string(),
    targetId: v.optional(v.string()),
    placement: v.union(
      v.literal("before"),
      v.literal("after"),
      v.literal("inside"),
      v.literal("root-end"),
    ),
  },
  handler: async (ctx, { libraryId, entityId, targetId, placement }) => {
    const { site } = await requireLibraryManagement(ctx, libraryId);

    const [folders, files] = await Promise.all([
      ctx.db
        .query("documentFolders")
        .withIndex("by_parent", (q) => q.eq("libraryId", libraryId))
        .collect(),
      ctx.db
        .query("files")
        .withIndex("by_folder", (q) => q.eq("libraryId", libraryId))
        .collect(),
    ]);
    const activeFolders = folders.filter(
      (value) => value.deletedAt === undefined,
    );
    const activeFiles = files.filter((value) => value.deletedAt === undefined);
    const folderIds = new Set(activeFolders.map((folder) => folder._id));
    const fileIds = new Set(activeFiles.map((file) => file._id));
    if (
      !folderIds.has(entityId as Id<"documentFolders">) &&
      !fileIds.has(entityId as Id<"files">)
    ) {
      throw new Error("Library item not found");
    }
    if (
      targetId &&
      !folderIds.has(targetId as Id<"documentFolders">) &&
      !fileIds.has(targetId as Id<"files">)
    ) {
      throw new Error("Target item not found");
    }
    if (
      placement === "inside" &&
      (!targetId || !folderIds.has(targetId as Id<"documentFolders">))
    ) {
      throw new Error("Files can only be moved inside folders");
    }

    const plan = planTreeMove(
      [
        ...activeFolders.map((folder) => ({
          id: folder._id,
          parentId: folder.parentId ?? null,
          order: folder.order,
        })),
        ...activeFiles.map((file) => ({
          id: file._id,
          parentId: file.folderId ?? null,
          order: file.order,
        })),
      ],
      {
        nodeId: entityId,
        targetId: targetId ?? null,
        placement,
      },
    );
    const now = Date.now();

    for (const update of plan.updates) {
      if (folderIds.has(update.id as Id<"documentFolders">)) {
        await ctx.db.patch(update.id as Id<"documentFolders">, {
          parentId: update.parentId
            ? (update.parentId as Id<"documentFolders">)
            : undefined,
          order: update.order,
          updatedAt: now,
        });
      } else {
        await ctx.db.patch(update.id as Id<"files">, {
          folderId: update.parentId
            ? (update.parentId as Id<"documentFolders">)
            : undefined,
          order: update.order,
        });
      }
    }
    await touchSiteDraft(
      ctx,
      site._id,
      now,
      plan.updates.map((update) =>
        folderIds.has(update.id as Id<"documentFolders">)
          ? {
              entityType: "folder" as const,
              entityId: update.id as Id<"documentFolders">,
            }
          : {
              entityType: "file" as const,
              entityId: update.id as Id<"files">,
            },
      ),
    );

    return { entityId, parentId: plan.parentId, order: plan.index };
  },
});
