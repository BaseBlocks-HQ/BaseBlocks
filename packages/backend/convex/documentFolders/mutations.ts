import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { getAuthContext } from "../auth";

// Create a new folder
export const create = mutation({
  args: {
    libraryId: v.id("documentLibraries"),
    parentId: v.optional(v.id("documentFolders")),
    name: v.string(),
  },
  handler: async (ctx, { libraryId, parentId, name }) => {
    const auth = await getAuthContext(ctx);

    const library = await ctx.db.get(libraryId);
    if (!library) throw new Error("Library not found");

    const site = await ctx.db.get(library.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

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
      (f) => f.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (duplicateFolder) {
      throw new Error(
        `A folder named "${name}" already exists in this location. Please choose a different name.`
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
export const update = mutation({
  args: {
    folderId: v.id("documentFolders"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { folderId, name }) => {
    const auth = await getAuthContext(ctx);

    const folder = await ctx.db.get(folderId);
    if (!folder) throw new Error("Folder not found");

    const library = await ctx.db.get(folder.libraryId);
    if (!library) throw new Error("Library not found");

    const site = await ctx.db.get(library.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    // Check for duplicate name if renaming
    if (name !== undefined && name.trim().toLowerCase() !== folder.name.toLowerCase()) {
      const siblings = await ctx.db
        .query("documentFolders")
        .withIndex("by_parent", (q) =>
          q.eq("libraryId", folder.libraryId).eq("parentId", folder.parentId),
        )
        .collect();

      const duplicateFolder = siblings.find(
        (f) => f._id !== folderId && f.name.toLowerCase() === name.trim().toLowerCase()
      );
      if (duplicateFolder) {
        throw new Error(
          `A folder named "${name}" already exists in this location. Please choose a different name.`
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
export const move = mutation({
  args: {
    folderId: v.id("documentFolders"),
    newParentId: v.optional(v.id("documentFolders")),
    newOrder: v.optional(v.number()),
  },
  handler: async (ctx, { folderId, newParentId, newOrder }) => {
    const auth = await getAuthContext(ctx);

    const folder = await ctx.db.get(folderId);
    if (!folder) throw new Error("Folder not found");

    const library = await ctx.db.get(folder.libraryId);
    if (!library) throw new Error("Library not found");

    const site = await ctx.db.get(library.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

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
  ctx: { db: any },
  folderId: string,
  libraryId: string,
) {
  // Delete all documents in this folder
  const documents = await ctx.db
    .query("documents")
    .withIndex("by_folder", (q: any) =>
      q.eq("libraryId", libraryId).eq("folderId", folderId),
    )
    .collect();

  for (const doc of documents) {
    await ctx.db.delete(doc._id);
  }

  // Recursively delete child folders
  const children = await ctx.db
    .query("documentFolders")
    .withIndex("by_parent", (q: any) =>
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
export const remove = mutation({
  args: { folderId: v.id("documentFolders") },
  handler: async (ctx, { folderId }) => {
    const auth = await getAuthContext(ctx);

    const folder = await ctx.db.get(folderId);
    if (!folder) throw new Error("Folder not found");

    const library = await ctx.db.get(folder.libraryId);
    if (!library) throw new Error("Library not found");

    const site = await ctx.db.get(library.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    await deleteFolderRecursively(ctx, folderId, folder.libraryId);

    return { success: true };
  },
});
