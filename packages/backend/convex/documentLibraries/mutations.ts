import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthContext } from "../auth";

// Create a new document library
export const create = mutation({
  args: {
    siteId: v.id("sites"),
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, { siteId, name, description, icon }) => {
    const auth = await getAuthContext(ctx);

    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();
    const libraryId = await ctx.db.insert("documentLibraries", {
      siteId,
      name,
      description,
      icon,
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });

    return libraryId;
  },
});

// Update document library
export const update = mutation({
  args: {
    libraryId: v.id("documentLibraries"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, { libraryId, name, description, icon }) => {
    const auth = await getAuthContext(ctx);

    const library = await ctx.db.get(libraryId);
    if (!library) throw new Error("Library not found");

    const site = await ctx.db.get(library.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (icon !== undefined) updates.icon = icon;

    await ctx.db.patch(libraryId, updates);
    return libraryId;
  },
});

// Delete document library and all its contents
export const remove = mutation({
  args: { libraryId: v.id("documentLibraries") },
  handler: async (ctx, { libraryId }) => {
    const auth = await getAuthContext(ctx);

    const library = await ctx.db.get(libraryId);
    if (!library) throw new Error("Library not found");

    const site = await ctx.db.get(library.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

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
