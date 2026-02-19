import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAdmin } from "../auth";

// Create a new Library
export const create = mutation({
  args: {
    siteId: v.id("sites"),
    name: v.string(),
  },
  handler: async (ctx, { siteId, name }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    const { auth } = await requireAdmin(ctx, site.teamId);

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

// Update Library
export const update = mutation({
  args: {
    libraryId: v.id("documentLibraries"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { libraryId, name }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) throw new Error("Library not found");

    const site = await ctx.db.get(library.siteId);
    if (!site) throw new Error("Site not found");

    await requireAdmin(ctx, site.teamId);

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

// Delete Libraryry and all its contents
export const remove = mutation({
  args: { libraryId: v.id("documentLibraries") },
  handler: async (ctx, { libraryId }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) throw new Error("Library not found");

    const site = await ctx.db.get(library.siteId);
    if (!site) throw new Error("Site not found");

    await requireAdmin(ctx, site.teamId);

    // Delete all documents in the library
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_library", (q) => q.eq("libraryId", libraryId))
      .collect();

    for (const doc of documents) {
      await ctx.db.delete(doc._id);
    }

    // Delete all folders in the library
    const folders = await ctx.db
      .query("documentFolders")
      .withIndex("by_library", (q) => q.eq("libraryId", libraryId))
      .collect();

    for (const folder of folders) {
      await ctx.db.delete(folder._id);
    }

    // Delete the library itself
    await ctx.db.delete(libraryId);

    return { success: true };
  },
});
