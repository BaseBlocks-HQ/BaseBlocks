import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAdmin } from "../auth";
import { isExtractable } from "../lib/extractable";

// Helper to get teamId from siteId
async function getTeamIdFromSite(
  ctx: { db: any },
  siteId: string,
): Promise<string | null> {
  const site = await ctx.db.get(siteId);
  if (!site) return null;
  return site.teamId;
}

// Create document record (after upload to Entity Storage)
export const create = mutation({
  args: {
    siteId: v.id("sites"),
    blobId: v.string(),
    cdnUrl: v.string(),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
  },
  handler: async (
    ctx,
    { siteId, blobId, cdnUrl, filename, contentType, size },
  ) => {
    const teamId = await getTeamIdFromSite(ctx, siteId);
    if (!teamId) throw new Error("Site not found");

    // Require admin access for write operations
    const { auth } = await requireAdmin(ctx, teamId as any);

    const extractable = isExtractable(contentType);
    const documentId = await ctx.db.insert("documents", {
      siteId,
      blobId,
      cdnUrl,
      filename,
      contentType,
      size,
      extractionStatus: extractable ? "pending" : "unsupported",
      uploadedBy: auth.userId,
      createdAt: Date.now(),
    });

    // Index in searchableContent so it's always findable by filename
    await ctx.db.insert("searchableContent", {
      siteId,
      contentType: "document",
      sourceId: documentId,
      title: filename,
      extractedText: filename,
      metadata: {
        filename,
        fileContentType: contentType,
        size,
        cdnUrl,
      },
      updatedAt: Date.now(),
    });

    return documentId;
  },
});

// Create document in a library (optionally in a folder)
export const createInLibrary = mutation({
  args: {
    siteId: v.id("sites"),
    libraryId: v.id("documentLibraries"),
    folderId: v.optional(v.id("documentFolders")),
    blobId: v.string(),
    cdnUrl: v.string(),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
  },
  handler: async (
    ctx,
    {
      siteId,
      libraryId,
      folderId,
      blobId,
      cdnUrl,
      filename,
      contentType,
      size,
    },
  ) => {
    const teamId = await getTeamIdFromSite(ctx, siteId);
    if (!teamId) throw new Error("Site not found");

    // Require admin access for write operations
    const { auth } = await requireAdmin(ctx, teamId as any);

    // Verify library exists and belongs to site
    const library = await ctx.db.get(libraryId);
    if (!library || library.siteId !== siteId) {
      throw new Error("Library not found");
    }

    // Verify folder exists and belongs to library if specified
    if (folderId) {
      const folder = await ctx.db.get(folderId);
      if (!folder || folder.libraryId !== libraryId) {
        throw new Error("Folder not found");
      }
    }

    const extractable = isExtractable(contentType);
    const documentId = await ctx.db.insert("documents", {
      siteId,
      libraryId,
      folderId,
      blobId,
      cdnUrl,
      filename,
      contentType,
      size,
      extractionStatus: extractable ? "pending" : "unsupported",
      uploadedBy: auth.userId,
      createdAt: Date.now(),
    });

    // Index in searchableContent so it's always findable by filename
    await ctx.db.insert("searchableContent", {
      siteId,
      contentType: "document",
      sourceId: documentId,
      title: filename,
      extractedText: filename,
      metadata: {
        filename,
        fileContentType: contentType,
        size,
        cdnUrl,
        libraryId,
      },
      updatedAt: Date.now(),
    });

    return documentId;
  },
});

// Move document to different folder
export const move = mutation({
  args: {
    documentId: v.id("documents"),
    folderId: v.optional(v.id("documentFolders")),
  },
  handler: async (ctx, { documentId, folderId }) => {
    const document = await ctx.db.get(documentId);
    if (!document) throw new Error("Document not found");

    const teamId = await getTeamIdFromSite(ctx, document.siteId);
    if (!teamId) throw new Error("Site not found");

    // Require admin access for write operations
    await requireAdmin(ctx, teamId as any);

    // Verify document is in a library
    if (!document.libraryId) {
      throw new Error("Document is not in a library");
    }

    // Verify folder belongs to same library if specified
    if (folderId) {
      const folder = await ctx.db.get(folderId);
      if (!folder || folder.libraryId !== document.libraryId) {
        throw new Error("Target folder not found in library");
      }
    }

    await ctx.db.patch(documentId, { folderId });
    return documentId;
  },
});

// Rename document
export const rename = mutation({
  args: {
    documentId: v.id("documents"),
    filename: v.string(),
  },
  handler: async (ctx, { documentId, filename }) => {
    const document = await ctx.db.get(documentId);
    if (!document) throw new Error("Document not found");

    const teamId = await getTeamIdFromSite(ctx, document.siteId);
    if (!teamId) throw new Error("Site not found");

    // Require admin access for write operations
    await requireAdmin(ctx, teamId as any);

    await ctx.db.patch(documentId, { filename });
    return documentId;
  },
});

// Update document metadata (e.g., after text extraction)
export const updateMetadata = mutation({
  args: {
    documentId: v.id("documents"),
    extractedText: v.optional(v.string()),
    pageCount: v.optional(v.number()),
  },
  handler: async (ctx, { documentId, extractedText, pageCount }) => {
    const document = await ctx.db.get(documentId);
    if (!document) throw new Error("Document not found");

    const teamId = await getTeamIdFromSite(ctx, document.siteId);
    if (!teamId) throw new Error("Site not found");

    // Require admin access for write operations
    await requireAdmin(ctx, teamId as any);

    const updates: Record<string, unknown> = {};
    if (extractedText !== undefined) updates.extractedText = extractedText;
    if (pageCount !== undefined) updates.pageCount = pageCount;

    await ctx.db.patch(documentId, updates);
    return documentId;
  },
});

// Delete document
export const remove = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const document = await ctx.db.get(documentId);
    if (!document) throw new Error("Document not found");

    const teamId = await getTeamIdFromSite(ctx, document.siteId);
    if (!teamId) throw new Error("Site not found");

    // Require admin access for write operations
    await requireAdmin(ctx, teamId as any);

    // Remove from search index
    const searchEntry = await ctx.db
      .query("searchableContent")
      .withIndex("by_source", (q: any) =>
        q.eq("contentType", "document").eq("sourceId", documentId)
      )
      .first();

    if (searchEntry) {
      await ctx.db.delete(searchEntry._id);
    }

    await ctx.db.delete(documentId);
  },
});
