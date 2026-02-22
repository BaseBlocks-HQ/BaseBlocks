import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { getAuthContext, requireMember } from "../auth";

// List all libraries for a site (authenticated)
export const list = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return [];

    await requireMember(ctx, site.teamId);

    return await ctx.db
      .query("documentLibraries")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
  },
});

// Get a single library
export const get = query({
  args: { libraryId: v.id("documentLibraries") },
  handler: async (ctx, { libraryId }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return null;

    const site = await ctx.db.get(library.siteId);
    if (!site) return null;

    await requireMember(ctx, site.teamId);

    return library;
  },
});

// Get library for public site viewing
export const getPublic = query({
  args: {
    libraryId: v.id("documentLibraries"),
  },
  handler: async (ctx, { libraryId }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return null;

    const site = await ctx.db.get(library.siteId);
    if (!site || !site.isPublished) return null;

    return library;
  },
});

// List libraries for public site viewing
export const listPublic = query({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site || !site.isPublished) return [];

    return await ctx.db
      .query("documentLibraries")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
  },
});

// List all libraries with document counts for the current user's sites
export const listAllWithCounts = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuthContext(ctx);

    // Find team via membership
    const membership = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId))
      .first();

    if (!membership) return [];

    const team = await ctx.db.get(membership.teamId);
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
          .query("documents")
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

// List libraries with counts for a specific site
export const listWithCounts = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return [];

    await requireMember(ctx, site.teamId);

    const libraries = await ctx.db
      .query("documentLibraries")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    return Promise.all(
      libraries.map(async (lib) => {
        const docs = await ctx.db
          .query("documents")
          .withIndex("by_library", (q) => q.eq("libraryId", lib._id))
          .collect();
        return { ...lib, documentCount: docs.length };
      }),
    );
  },
});
