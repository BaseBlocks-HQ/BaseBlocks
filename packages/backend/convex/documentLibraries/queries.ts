import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { type QueryCtx, query } from "../_generated/server";
import { checkIsMember } from "../auth";
import { mapDocumentListing } from "../documents/listings";
import { getActiveLibraryIds } from "../lib/resolvers";
import { canAccessPublishedSite } from "../sharing/access";

const librarySummary = v.object({
  _id: v.id("documentLibraries"),
  name: v.string(),
  siteId: v.id("sites"),
});

const librarySiteSummary = v.object({
  _id: v.id("sites"),
  name: v.string(),
  teamId: v.id("teams"),
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
    teamId: Id<"teams">;
  },
) {
  const folders = await ctx.db
    .query("documentFolders")
    .withIndex("by_library", (q) => q.eq("libraryId", library._id))
    .collect();
  const listings = await ctx.db
    .query("documentListings")
    .withIndex("by_library", (q) => q.eq("libraryId", library._id))
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
      teamId: site.teamId,
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
    files: listings
      .map(mapDocumentListing)
      .map((file) => ({
        _id: file._id,
        filename: file.filename,
        contentType: file.contentType,
        size: file.size,
        downloadUrl: file.downloadUrl,
        folderId: file.folderId,
      }))
      .sort((a, b) => a.filename.localeCompare(b.filename)),
  };
}

export const list = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return [];

    if (!(await checkIsMember(ctx, site.teamId))) return [];

    return await ctx.db
      .query("documentLibraries")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
  },
});

export const get = query({
  args: { libraryId: v.id("documentLibraries") },
  handler: async (ctx, { libraryId }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return null;

    const site = await ctx.db.get(library.siteId);
    if (!site) return null;

    if (!(await checkIsMember(ctx, site.teamId))) return null;

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

    if (!(await checkIsMember(ctx, site.teamId))) return null;

    return await buildExplorerPayload(ctx, library, site);
  },
});

export const getPublic = query({
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

export const listPublic = query({
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
  args: { teamId: v.id("teams") },
  handler: async (ctx, { teamId }) => {
    if (!(await checkIsMember(ctx, teamId))) return [];

    const team = await ctx.db.get(teamId);
    if (!team) return [];

    const sites = await ctx.db
      .query("sites")
      .withIndex("by_team", (q) => q.eq("teamId", team._id))
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
          .query("documentListings")
          .withIndex("by_library", (q) => q.eq("libraryId", lib._id))
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

    if (!(await checkIsMember(ctx, site.teamId))) return [];

    const libraries = await ctx.db
      .query("documentLibraries")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    return Promise.all(
      libraries.map(async (lib) => {
        const docs = await ctx.db
          .query("documentListings")
          .withIndex("by_library", (q) => q.eq("libraryId", lib._id))
          .collect();
        return { ...lib, documentCount: docs.length };
      }),
    );
  },
});
