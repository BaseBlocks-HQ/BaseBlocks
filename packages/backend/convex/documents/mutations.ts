import {
  getStorageBucketNameFromEnv,
  getStorageProviderNameFromEnv,
} from "@baseblocks/storage";
import { v } from "convex/values";
import { type MutationCtx, mutation } from "../_generated/server";
import { requireLibraryManager } from "../auth";
import { buildDocumentSearchMetadata } from "../lib/documentSearchMetadata";
import { isExtractable } from "../lib/extractable";
import { markSiteModified } from "../lib/markModified";
import { resolveSiteContext } from "../lib/resolvers";
import { deleteDocumentRows } from "./lib";
import { upsertDocumentListing } from "./listings";

async function createDocumentAsset(
  ctx: MutationCtx,
  args: {
    siteId: Parameters<typeof resolveSiteContext>[1];
    uploadedBy: string;
    objectKey: string;
    filename: string;
    contentType: string;
    size: number;
    checksum?: string;
  },
) {
  return await ctx.db.insert("assets", {
    siteId: args.siteId,
    kind: "document",
    visibility: "private",
    provider: getStorageProviderNameFromEnv(),
    bucket: getStorageBucketNameFromEnv(),
    objectKey: args.objectKey,
    filename: args.filename,
    contentType: args.contentType,
    size: args.size,
    checksum: args.checksum,
    uploadedBy: args.uploadedBy,
    createdAt: Date.now(),
  });
}

async function patchDocumentSearchEntry(
  ctx: MutationCtx,
  document: {
    _id: string;
    siteId: string;
    assetId?: string;
    filename: string;
    contentType: string;
    size: number;
    libraryId?: string;
    extractedText?: string;
  },
) {
  const entry = await ctx.db
    .query("searchableContent")
    .withIndex("by_source", (q) =>
      q.eq("contentType", "document").eq("sourceId", document._id),
    )
    .first();

  if (!entry) {
    return;
  }

  await ctx.db.patch(entry._id, {
    title: document.filename,
    extractedText: document.extractedText?.trim()
      ? document.extractedText
      : document.filename,
    metadata: buildDocumentSearchMetadata({
      documentId: document._id,
      assetId: document.assetId,
      filename: document.filename,
      contentType: document.contentType,
      size: document.size,
      libraryId: document.libraryId,
    }),
    updatedAt: Date.now(),
  });
}

// Create document record after direct upload to object storage
export const create = mutation({
  args: {
    siteId: v.id("sites"),
    objectKey: v.string(),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
    checksum: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { siteId, objectKey, filename, contentType, size, checksum },
  ) => {
    const siteCtx = await resolveSiteContext(ctx, siteId);
    if (!siteCtx) throw new Error("Site not found");

    const { auth } = await requireLibraryManager(ctx, siteCtx.teamId);
    const assetId = await createDocumentAsset(ctx, {
      siteId,
      uploadedBy: auth.userId,
      objectKey,
      filename,
      contentType,
      size,
      checksum,
    });

    const extractable = isExtractable(contentType);
    const documentId = await ctx.db.insert("documents", {
      siteId,
      assetId,
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
      metadata: buildDocumentSearchMetadata({
        documentId,
        assetId,
        filename,
        contentType,
        size,
      }),
      updatedAt: Date.now(),
    });

    await upsertDocumentListing(ctx, {
      _id: documentId,
      siteId,
      assetId,
      filename,
      contentType,
      size,
      extractionStatus: extractable ? "pending" : "unsupported",
      uploadedBy: auth.userId,
      createdAt: Date.now(),
    });

    await markSiteModified(ctx, siteId);
    return documentId;
  },
});

// Create document in a library (optionally in a folder)
export const createInLibrary = mutation({
  args: {
    siteId: v.id("sites"),
    libraryId: v.id("documentLibraries"),
    folderId: v.optional(v.id("documentFolders")),
    objectKey: v.string(),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
    checksum: v.optional(v.string()),
  },
  handler: async (
    ctx,
    {
      siteId,
      libraryId,
      folderId,
      objectKey,
      filename,
      contentType,
      size,
      checksum,
    },
  ) => {
    const siteCtx = await resolveSiteContext(ctx, siteId);
    if (!siteCtx) throw new Error("Site not found");

    const { auth } = await requireLibraryManager(ctx, siteCtx.teamId);

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

    const assetId = await createDocumentAsset(ctx, {
      siteId,
      uploadedBy: auth.userId,
      objectKey,
      filename,
      contentType,
      size,
      checksum,
    });

    const extractable = isExtractable(contentType);
    const documentId = await ctx.db.insert("documents", {
      siteId,
      libraryId,
      folderId,
      assetId,
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
      metadata: buildDocumentSearchMetadata({
        documentId,
        assetId,
        filename,
        contentType,
        size,
        libraryId,
      }),
      updatedAt: Date.now(),
    });

    await upsertDocumentListing(ctx, {
      _id: documentId,
      siteId,
      libraryId,
      folderId,
      assetId,
      filename,
      contentType,
      size,
      extractionStatus: extractable ? "pending" : "unsupported",
      uploadedBy: auth.userId,
      createdAt: Date.now(),
    });

    await markSiteModified(ctx, siteId);
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

    const siteCtx = await resolveSiteContext(ctx, document.siteId);
    if (!siteCtx) throw new Error("Site not found");

    await requireLibraryManager(ctx, siteCtx.teamId);

    if (!document.libraryId) {
      throw new Error("Document is not in a library");
    }

    if (folderId) {
      const folder = await ctx.db.get(folderId);
      if (!folder || folder.libraryId !== document.libraryId) {
        throw new Error("Target folder not found in library");
      }
    }

    await ctx.db.patch(documentId, { folderId });
    await upsertDocumentListing(ctx, { ...document, folderId });
    await patchDocumentSearchEntry(ctx, document);
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

    const siteCtx = await resolveSiteContext(ctx, document.siteId);
    if (!siteCtx) throw new Error("Site not found");

    await requireLibraryManager(ctx, siteCtx.teamId);

    await ctx.db.patch(documentId, { filename });
    await upsertDocumentListing(ctx, { ...document, filename });
    await patchDocumentSearchEntry(ctx, { ...document, filename });
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

    const siteCtx = await resolveSiteContext(ctx, document.siteId);
    if (!siteCtx) throw new Error("Site not found");

    await requireLibraryManager(ctx, siteCtx.teamId);

    const updates: Record<string, unknown> = {};
    if (extractedText !== undefined) updates.extractedText = extractedText;
    if (pageCount !== undefined) updates.pageCount = pageCount;

    await ctx.db.patch(documentId, updates);
    await upsertDocumentListing(ctx, { ...document, ...updates });
    await patchDocumentSearchEntry(ctx, { ...document, ...updates });
    return documentId;
  },
});

// Delete document
export const remove = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const document = await ctx.db.get(documentId);
    if (!document) throw new Error("Document not found");

    const siteCtx = await resolveSiteContext(ctx, document.siteId);
    if (!siteCtx) throw new Error("Site not found");

    await requireLibraryManager(ctx, siteCtx.teamId);

    await deleteDocumentRows(ctx, document);
    await markSiteModified(ctx, document.siteId);
  },
});
