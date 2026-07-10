// Flattened Convex domain module. Keep this file as the public API for this domain.
import { v } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { query, mutation } from "./_generated/server";
import { isOrganizationMember, requireOrganizationPermission } from "./permissions";
import { buildDocumentDownloadUrl, deleteDocumentRows } from "./documents";
import { canAccessPublishedSite } from "./sharing";
import { getActiveLibraryIds } from "./sites";

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
  _id: v.id("documents"),
  filename: v.string(),
  contentType: v.string(),
  size: v.number(),
  downloadUrl: v.string(),
  folderId: v.optional(v.id("documentFolders")),
});

const explorerPayload = v.object({
  library: librarySummary,
  site: librarySiteSummary,
  folders: v.array(libraryFolderSummary),
  files: v.array(libraryFileSummary),
});

async function buildExplorerPayload(
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
  const folders = await ctx.db
    .query("documentFolders")
    .withIndex("by_parent", (q) => q.eq("libraryId", library._id))
    .collect();
  const documents = await ctx.db
    .query("documents")
    .withIndex("by_folder", (q) => q.eq("libraryId", library._id))
    .collect();

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
      .map((folder) => ({
        _id: folder._id,
        libraryId: folder.libraryId,
        parentId: folder.parentId,
        name: folder.name,
        order: folder.order,
      }))
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
    files: documents
      .map((document) => ({
        _id: document._id,
        filename: document.filename,
        contentType: document.contentType,
        size: document.size,
        downloadUrl: buildDocumentDownloadUrl(document._id),
        folderId: document.folderId,
      }))
      .sort((a, b) => a.filename.localeCompare(b.filename)),
  };
}

export const listLibraries = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return [];

    if (!(await isOrganizationMember(ctx, site.organizationId))) return [];

    return await ctx.db
      .query("documentLibraries")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
  },
});

export const getLibrary = query({
  args: { libraryId: v.id("documentLibraries") },
  handler: async (ctx, { libraryId }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return null;

    const site = await ctx.db.get(library.siteId);
    if (!site) return null;

    if (!(await isOrganizationMember(ctx, site.organizationId))) return null;

    return library;
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

    return await buildExplorerPayload(ctx, library, site);
  },
});

export const getPublicLibrary = query({
  args: {
    libraryId: v.id("documentLibraries"),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { libraryId, sessionTokens }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return null;

    const site = await ctx.db.get(library.siteId);
    if (!site || !(await canAccessPublishedSite(ctx, site, sessionTokens))) {
      return null;
    }

    return library;
  },
});

export const getPublicExplorer = query({
  args: {
    libraryId: v.id("documentLibraries"),
    sessionTokens: v.optional(v.array(v.string())),
  },
  returns: v.union(explorerPayload, v.null()),
  handler: async (ctx, { libraryId, sessionTokens }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return null;

    const site = await ctx.db.get(library.siteId);
    if (!site || !(await canAccessPublishedSite(ctx, site, sessionTokens))) {
      return null;
    }

    const activeLibraryIds = await getActiveLibraryIds(ctx, library.siteId);
    if (!activeLibraryIds.has(libraryId)) return null;

    return await buildExplorerPayload(ctx, library, site);
  },
});

export const listPublicLibraries = query({
  args: {
    siteId: v.id("sites"),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { siteId, sessionTokens }) => {
    const site = await ctx.db.get(siteId);
    if (!site || !(await canAccessPublishedSite(ctx, site, sessionTokens))) {
      return [];
    }

    return await ctx.db
      .query("documentLibraries")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
  },
});

export const listAllWithCounts = query({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) => {
    if (!(await isOrganizationMember(ctx, organizationId))) return [];

    const sites = await ctx.db
      .query("sites")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Get all libraries for all sites
    const allLibraries: Array<{
      _id: Id<"documentLibraries">;
      siteId: Id<"sites">;
      name: string;
      documentCount: number;
    }> = [];

    for (const site of sites) {
      const libraries = await ctx.db
        .query("documentLibraries")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect();

      for (const lib of libraries) {
        const docs = await ctx.db
          .query("documents")
          .withIndex("by_folder", (q) => q.eq("libraryId", lib._id))
          .collect();

        allLibraries.push({
          _id: lib._id,
          siteId: lib.siteId,
          name: lib.name,
          documentCount: docs.length,
        });
      }
    }

    return allLibraries;
  },
});

export const listWithCounts = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return [];

    if (!(await isOrganizationMember(ctx, site.organizationId))) return [];

    const libraries = await ctx.db
      .query("documentLibraries")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    return Promise.all(
      libraries.map(async (lib) => {
        const docs = await ctx.db
          .query("documents")
          .withIndex("by_folder", (q) => q.eq("libraryId", lib._id))
          .collect();
        return { ...lib, documentCount: docs.length };
      }),
    );
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

    const { auth } = await requireOrganizationPermission(ctx, site.organizationId, { resource: "library", action: "manage" });

    // Check for duplicate library name within site
    const existingLibrary = await ctx.db
      .query("documentLibraries")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .filter((q) => q.eq(q.field("name"), name.trim()))
      .first();

    if (existingLibrary) {
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

    return libraryId;
  },
});

export const updateLibrary = mutation({
  args: {
    libraryId: v.id("documentLibraries"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { libraryId, name }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) throw new Error("Library not found");

    const site = await ctx.db.get(library.siteId);
    if (!site) throw new Error("Site not found");

    await requireOrganizationPermission(ctx, site.organizationId, { resource: "library", action: "manage" });

    // Check for duplicate library name if changing
    if (name !== undefined && name.trim() !== library.name) {
      const existingLibrary = await ctx.db
        .query("documentLibraries")
        .withIndex("by_site", (q) => q.eq("siteId", library.siteId))
        .filter((q) => q.eq(q.field("name"), name.trim()))
        .first();

      if (existingLibrary && existingLibrary._id !== libraryId) {
        throw new Error(
          `A library named "${name}" already exists. Please choose a different name.`,
        );
      }
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (name !== undefined) updates.name = name.trim();

    await ctx.db.patch(libraryId, updates);
    return libraryId;
  },
});

export const removeLibrary = mutation({
  args: { libraryId: v.id("documentLibraries") },
  handler: async (ctx, { libraryId }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) throw new Error("Library not found");

    const site = await ctx.db.get(library.siteId);
    if (!site) throw new Error("Site not found");

    await requireOrganizationPermission(ctx, site.organizationId, { resource: "library", action: "manage" });

    // Delete all documents in the library (full cleanup: search index + asset + S3)
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_folder", (q) => q.eq("libraryId", libraryId))
      .collect();

    for (const doc of documents) {
      await deleteDocumentRows(ctx, doc);
    }

    // Delete all folders in the library
    const folders = await ctx.db
      .query("documentFolders")
      .withIndex("by_parent", (q) => q.eq("libraryId", libraryId))
      .collect();

    for (const folder of folders) {
      await ctx.db.delete(folder._id);
    }

    // Delete the library itself
    await ctx.db.delete(libraryId);

    return { success: true };
  },
});

// List all folders in a library (flat list)
export const listFoldersByLibrary = query({
  args: { libraryId: v.id("documentLibraries") },
  handler: async (ctx, { libraryId }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site) return [];

    if (!(await isOrganizationMember(ctx, site.organizationId))) return [];

    const folders = await ctx.db
      .query("documentFolders")
      .withIndex("by_parent", (q) => q.eq("libraryId", libraryId))
      .collect();

    return folders.sort((a, b) => a.order - b.order);
  },
});

// List folders by parent (for tree navigation)
export const listByParent = query({
  args: {
    libraryId: v.id("documentLibraries"),
    parentId: v.optional(v.id("documentFolders")),
  },
  handler: async (ctx, { libraryId, parentId }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site) return [];

    if (!(await isOrganizationMember(ctx, site.organizationId))) return [];

    const folders = await ctx.db
      .query("documentFolders")
      .withIndex("by_parent", (q) =>
        q.eq("libraryId", libraryId).eq("parentId", parentId),
      )
      .collect();

    return folders.sort((a, b) => a.order - b.order);
  },
});

// Get a single folder
export const getFolder = query({
  args: { folderId: v.id("documentFolders") },
  handler: async (ctx, { folderId }) => {
    const folder = await ctx.db.get(folderId);
    if (!folder) return null;

    const library = await ctx.db.get(folder.libraryId);
    if (!library) return null;

    const site = await ctx.db.get(library.siteId);
    if (!site) return null;

    if (!(await isOrganizationMember(ctx, site.organizationId))) return null;

    return folder;
  },
});

// Get folder path (breadcrumbs)
export const getPath = query({
  args: { folderId: v.id("documentFolders") },
  handler: async (ctx, { folderId }) => {
    const folder = await ctx.db.get(folderId);
    if (!folder) return [];

    const library = await ctx.db.get(folder.libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site) return [];

    if (!(await isOrganizationMember(ctx, site.organizationId))) return [];

    // Build path from folder to root (with cycle detection)
    const path: Array<{ _id: string; name: string }> = [];
    const visited = new Set<string>();
    let current: typeof folder | null = folder;

    while (current) {
      if (visited.has(current._id)) break; // Circular reference detected
      visited.add(current._id);
      path.unshift({ _id: current._id, name: current.name });
      if (current.parentId) {
        current = await ctx.db.get(current.parentId);
      } else {
        break;
      }
    }

    return path;
  },
});

// List folders for public viewing
export const listFoldersByLibraryPublic = query({
  args: {
    libraryId: v.id("documentLibraries"),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { libraryId, sessionTokens }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site || !(await canAccessPublishedSite(ctx, site, sessionTokens))) {
      return [];
    }

    const folders = await ctx.db
      .query("documentFolders")
      .withIndex("by_parent", (q) => q.eq("libraryId", libraryId))
      .collect();

    return folders.sort((a, b) => a.order - b.order);
  },
});

// List folders by parent for public viewing
export const listByParentPublic = query({
  args: {
    libraryId: v.id("documentLibraries"),
    parentId: v.optional(v.id("documentFolders")),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { libraryId, parentId, sessionTokens }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site || !(await canAccessPublishedSite(ctx, site, sessionTokens))) {
      return [];
    }

    const folders = await ctx.db
      .query("documentFolders")
      .withIndex("by_parent", (q) =>
        q.eq("libraryId", libraryId).eq("parentId", parentId),
      )
      .collect();

    return folders.sort((a, b) => a.order - b.order);
  },
});

// Get folder path for public viewing
export const getPathPublic = query({
  args: {
    folderId: v.id("documentFolders"),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { folderId, sessionTokens }) => {
    const folder = await ctx.db.get(folderId);
    if (!folder) return [];

    const library = await ctx.db.get(folder.libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site || !(await canAccessPublishedSite(ctx, site, sessionTokens))) {
      return [];
    }

    // Build path from folder to root (with cycle detection)
    const path: Array<{ _id: string; name: string }> = [];
    const visited = new Set<string>();
    let current: typeof folder | null = folder;

    while (current) {
      if (visited.has(current._id)) break; // Circular reference detected
      visited.add(current._id);
      path.unshift({ _id: current._id, name: current.name });
      if (current.parentId) {
        current = await ctx.db.get(current.parentId);
      } else {
        break;
      }
    }

    return path;
  },
});

// Create a new folder
export const createFolder = mutation({
  args: {
    libraryId: v.id("documentLibraries"),
    parentId: v.optional(v.id("documentFolders")),
    name: v.string(),
  },
  handler: async (ctx, { libraryId, parentId, name }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) throw new Error("Library not found");

    const site = await ctx.db.get(library.siteId);
    if (!site) throw new Error("Site not found");

    const { auth } = await requireOrganizationPermission(ctx, site.organizationId, { resource: "library", action: "manage" });

    // Verify parent folder exists if specified
    if (parentId) {
      const parent = await ctx.db.get(parentId);
      if (!parent || parent.libraryId !== libraryId) {
        throw new Error("Parent folder not found");
      }
    }

    // Get siblings and check for duplicate name
    const siblings = await ctx.db
      .query("documentFolders")
      .withIndex("by_parent", (q) =>
        q.eq("libraryId", libraryId).eq("parentId", parentId),
      )
      .collect();

    const duplicateFolder = siblings.find(
      (f) => f.name.toLowerCase() === name.trim().toLowerCase(),
    );
    if (duplicateFolder) {
      throw new Error(
        `A folder named "${name}" already exists in this location. Please choose a different name.`,
      );
    }

    const maxOrder = siblings.reduce((max, f) => Math.max(max, f.order), -1);

    const now = Date.now();
    const folderId = await ctx.db.insert("documentFolders", {
      libraryId,
      parentId,
      name: name.trim(),
      order: maxOrder + 1,
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });

    return folderId;
  },
});

// Update folder (rename)
export const updateFolder = mutation({
  args: {
    folderId: v.id("documentFolders"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { folderId, name }) => {
    const folder = await ctx.db.get(folderId);
    if (!folder) throw new Error("Folder not found");

    const library = await ctx.db.get(folder.libraryId);
    if (!library) throw new Error("Library not found");

    const site = await ctx.db.get(library.siteId);
    if (!site) throw new Error("Site not found");

    await requireOrganizationPermission(ctx, site.organizationId, { resource: "library", action: "manage" });

    // Check for duplicate name if renaming
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
    return folderId;
  },
});

// Move folder to new parent
export const moveFolder = mutation({
  args: {
    folderId: v.id("documentFolders"),
    newParentId: v.optional(v.id("documentFolders")),
    newOrder: v.optional(v.number()),
  },
  handler: async (ctx, { folderId, newParentId, newOrder }) => {
    const folder = await ctx.db.get(folderId);
    if (!folder) throw new Error("Folder not found");

    const library = await ctx.db.get(folder.libraryId);
    if (!library) throw new Error("Library not found");

    const site = await ctx.db.get(library.siteId);
    if (!site) throw new Error("Site not found");

    await requireOrganizationPermission(ctx, site.organizationId, { resource: "library", action: "manage" });

    // Verify new parent exists if specified
    if (newParentId) {
      const parent = await ctx.db.get(newParentId);
      if (!parent || parent.libraryId !== folder.libraryId) {
        throw new Error("Target folder not found");
      }

      // Prevent moving folder into itself or its descendants
      let checkId: Id<"documentFolders"> | undefined = newParentId;
      while (checkId) {
        if (checkId === folderId) {
          throw new Error("Cannot move folder into itself or its descendants");
        }
        const checkFolder: Doc<"documentFolders"> | null =
          await ctx.db.get(checkId);
        checkId = checkFolder?.parentId;
      }
    }

    // Calculate order if not specified
    let order = newOrder;
    if (order === undefined) {
      const siblings = await ctx.db
        .query("documentFolders")
        .withIndex("by_parent", (q) =>
          q.eq("libraryId", folder.libraryId).eq("parentId", newParentId),
        )
        .collect();

      order = siblings.reduce((max, f) => Math.max(max, f.order), -1) + 1;
    }

    await ctx.db.patch(folderId, {
      parentId: newParentId,
      order,
      updatedAt: Date.now(),
    });

    return folderId;
  },
});

// Helper to recursively delete folder and contents
async function deleteFolderRecursively(
  ctx: MutationCtx,
  folderId: Id<"documentFolders">,
  libraryId: Id<"documentLibraries">,
) {
  // Delete all documents in this folder (full cleanup: search index + asset + S3)
  const documents = await ctx.db
    .query("documents")
    .withIndex("by_folder", (q) =>
      q.eq("libraryId", libraryId).eq("folderId", folderId),
    )
    .collect();

  for (const doc of documents) {
    await deleteDocumentRows(ctx, doc);
  }

  // Recursively delete child folders
  const children = await ctx.db
    .query("documentFolders")
    .withIndex("by_parent", (q) =>
      q.eq("libraryId", libraryId).eq("parentId", folderId),
    )
    .collect();

  for (const child of children) {
    await deleteFolderRecursively(ctx, child._id, libraryId);
  }

  // Delete the folder itself
  await ctx.db.delete(folderId);
}

// Delete folder and all contents
export const removeFolder = mutation({
  args: { folderId: v.id("documentFolders") },
  handler: async (ctx, { folderId }) => {
    const folder = await ctx.db.get(folderId);
    if (!folder) throw new Error("Folder not found");

    const library = await ctx.db.get(folder.libraryId);
    if (!library) throw new Error("Library not found");

    const site = await ctx.db.get(library.siteId);
    if (!site) throw new Error("Site not found");

    await requireOrganizationPermission(ctx, site.organizationId, { resource: "library", action: "manage" });

    await deleteFolderRecursively(ctx, folderId, folder.libraryId);

    return { success: true };
  },
});
