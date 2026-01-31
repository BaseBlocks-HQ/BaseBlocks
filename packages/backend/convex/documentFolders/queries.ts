import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthContext } from "../auth";

// List all folders in a library (flat list)
export const listByLibrary = query({
  args: { libraryId: v.id("documentLibraries") },
  handler: async (ctx, { libraryId }) => {
    const auth = await getAuthContext(ctx);

    const library = await ctx.db.get(libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site) return [];

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    const folders = await ctx.db
      .query("documentFolders")
      .withIndex("by_library", (q) => q.eq("libraryId", libraryId))
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
    const auth = await getAuthContext(ctx);

    const library = await ctx.db.get(libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site) return [];

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
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

// Get a single folder
export const get = query({
  args: { folderId: v.id("documentFolders") },
  handler: async (ctx, { folderId }) => {
    const auth = await getAuthContext(ctx);

    const folder = await ctx.db.get(folderId);
    if (!folder) return null;

    const library = await ctx.db.get(folder.libraryId);
    if (!library) return null;

    const site = await ctx.db.get(library.siteId);
    if (!site) return null;

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    return folder;
  },
});

// Get folder path (breadcrumbs)
export const getPath = query({
  args: { folderId: v.id("documentFolders") },
  handler: async (ctx, { folderId }) => {
    const auth = await getAuthContext(ctx);

    const folder = await ctx.db.get(folderId);
    if (!folder) return [];

    const library = await ctx.db.get(folder.libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site) return [];

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    // Build path from folder to root
    const path: Array<{ _id: string; name: string }> = [];
    let current: typeof folder | null = folder;

    while (current) {
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
export const listByLibraryPublic = query({
  args: {
    libraryId: v.id("documentLibraries"),
  },
  handler: async (ctx, { libraryId }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site || !site.isPublished) return [];

    const folders = await ctx.db
      .query("documentFolders")
      .withIndex("by_library", (q) => q.eq("libraryId", libraryId))
      .collect();

    return folders.sort((a, b) => a.order - b.order);
  },
});

// List folders by parent for public viewing
export const listByParentPublic = query({
  args: {
    libraryId: v.id("documentLibraries"),
    parentId: v.optional(v.id("documentFolders")),
  },
  handler: async (ctx, { libraryId, parentId }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site || !site.isPublished) return [];

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
  },
  handler: async (ctx, { folderId }) => {
    const folder = await ctx.db.get(folderId);
    if (!folder) return [];

    const library = await ctx.db.get(folder.libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site || !site.isPublished) return [];

    // Build path from folder to root
    const path: Array<{ _id: string; name: string }> = [];
    let current: typeof folder | null = folder;

    while (current) {
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
