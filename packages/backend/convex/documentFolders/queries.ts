import { v } from "convex/values";
import { query } from "../_generated/server";
import { checkIsMember } from "../auth";
import { canAccessPublishedSite } from "../sharing/access";

// List all folders in a library (flat list)
export const listByLibrary = query({
  args: { libraryId: v.id("documentLibraries") },
  handler: async (ctx, { libraryId }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site) return [];

    if (!(await checkIsMember(ctx, site.teamId))) return [];

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

    if (!(await checkIsMember(ctx, site.teamId))) return [];

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
    const folder = await ctx.db.get(folderId);
    if (!folder) return null;

    const library = await ctx.db.get(folder.libraryId);
    if (!library) return null;

    const site = await ctx.db.get(library.siteId);
    if (!site) return null;

    if (!(await checkIsMember(ctx, site.teamId))) return null;

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

    if (!(await checkIsMember(ctx, site.teamId))) return [];

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
export const listByLibraryPublic = query({
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
