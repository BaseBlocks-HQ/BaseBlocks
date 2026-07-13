import {
  isSupportedUploadMimeType,
  parseFileKey,
  resolveUploadMimeType,
} from "@baseblocks/domain";
import type { GenericQueryCtx } from "convex/server";
import { v } from "convex/values";
import { type MutationCtx, query, mutation } from "./_generated/server";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import {
  requireOrganizationPermission,
  requireOrganizationMember,
} from "./permissions";
import { canAccessPublishedSite } from "./sharing";
import { getActiveLibraryIds, resolveSiteContext } from "./model/sites";
import {
  collectOpenEditorAttributeValues,
  parseOpenEditorDocument,
} from "./openEditorDocuments";

export function buildDocumentDownloadUrl(documentId: Id<"documents">): string {
  return `/api/files/${documentId}`;
}

type SearchMetadata = {
  fileId?: Id<"files">;
  filename?: string;
  fileContentType?: string;
  size?: number;
  libraryId?: string;
};

export function normalizeDocumentSearchMetadata(args: {
  sourceId: string;
  metadata: SearchMetadata;
}) {
  return {
    ...args.metadata,
    downloadUrl: buildDocumentDownloadUrl(args.sourceId as never),
  };
}

/**
 * Shared document deletion helper.
 *
 * Centralises the cleanup logic so that every code path that removes a document
 * (single delete, library delete, folder delete, site delete) goes through the
 * same sequence:
 *   1. Remove the canonical search index entry.
 *   2. Delete the file metadata row.
 *   3. Delete the document row.
 * Object deletion is coordinated by Next.js before this metadata mutation.
 */

export async function deleteDocumentRows(
  ctx: MutationCtx,
  document: Doc<"documents">,
): Promise<void> {
  // 1. Remove search index entry
  const searchEntry = await ctx.db
    .query("searchEntries")
    .withIndex("by_source", (q) =>
      q.eq("kind", "document").eq("sourceId", document._id),
    )
    .first();
  if (searchEntry) {
    await ctx.db.delete(searchEntry._id);
  }

  // 2. Delete the file metadata record
  if (document.fileId) {
    await ctx.db.delete(document.fileId);
  }

  // 3. Delete the document record
  await ctx.db.delete(document._id);
}

function mapDocument(doc: Doc<"documents">) {
  const downloadUrl = buildDocumentDownloadUrl(doc._id);
  return {
    ...doc,
    downloadUrl,
  };
}

async function isPublishedFileBlockDocument(
  ctx: Pick<GenericQueryCtx<DataModel>, "db">,
  document: Doc<"documents">,
) {
  const contents = await ctx.db
    .query("openEditorPageContents")
    .withIndex("by_site", (q) => q.eq("siteId", document.siteId))
    .collect();

  for (const content of contents)
    if (
      collectOpenEditorAttributeValues(
        parseOpenEditorDocument(content.document),
        "attachment",
        ["attachmentId"],
      ).has(document._id)
    )
      return true;

  return false;
}

export const get = query({
  args: { documentId: v.string() },
  handler: async (ctx, { documentId }) => {
    const normalizedDocumentId = ctx.db.normalizeId("documents", documentId);
    if (!normalizedDocumentId) return null;
    const doc = await ctx.db.get(normalizedDocumentId);
    if (!doc) return null;

    const site = await ctx.db.get(doc.siteId);
    if (!site) return null;

    await requireOrganizationMember(ctx, site.organizationId);
    return mapDocument(doc);
  },
});

export const getDownloadAsset = query({
  args: { documentId: v.string() },
  handler: async (ctx, { documentId }) => {
    const normalizedDocumentId = ctx.db.normalizeId("documents", documentId);
    if (!normalizedDocumentId) return null;
    const document = await ctx.db.get(normalizedDocumentId);
    if (!document) {
      return null;
    }

    const site = await ctx.db.get(document.siteId);
    if (!site) {
      return null;
    }

    await requireOrganizationMember(ctx, site.organizationId);

    if (!document.fileId) {
      return null;
    }

    const asset = await ctx.db.get(document.fileId);
    if (!asset) {
      return null;
    }

    return {
      documentId: document._id,
      filename: document.filename,
      contentType: document.contentType,
      size: document.size,
      objectKey: asset.objectKey,
    };
  },
});

export const getPublicDownloadAsset = query({
  args: {
    documentId: v.string(),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { documentId, sessionTokens }) => {
    const normalizedDocumentId = ctx.db.normalizeId("documents", documentId);
    if (!normalizedDocumentId) return null;
    const document = await ctx.db.get(normalizedDocumentId);
    if (!document?.fileId) {
      return null;
    }

    const site = await ctx.db.get(document.siteId);
    if (!site || !(await canAccessPublishedSite(ctx, site, sessionTokens))) {
      return null;
    }

    if (document.libraryId) {
      const activeLibraryIds = await getActiveLibraryIds(ctx, document.siteId);
      if (!activeLibraryIds.has(document.libraryId)) {
        return null;
      }
    } else {
      const isPublishedFile = await isPublishedFileBlockDocument(ctx, document);
      if (!isPublishedFile) {
        return null;
      }
    }

    const asset = await ctx.db.get(document.fileId);
    if (!asset) {
      return null;
    }

    return {
      documentId: document._id,
      filename: document.filename,
      contentType: document.contentType,
      size: document.size,
      objectKey: asset.objectKey,
    };
  },
});

function validateDocumentUpload(args: {
  siteId: string;
  objectKey: string;
  contentType: string;
  size: number;
}): string {
  const parsed = parseFileKey(args.objectKey);
  if (!parsed || parsed.siteId !== args.siteId || parsed.kind !== "documents") {
    throw new Error("Invalid document key");
  }

  const contentType = resolveUploadMimeType({
    filename: parsed.filename,
    contentType: args.contentType,
  });

  if (!isSupportedUploadMimeType(contentType)) {
    throw new Error("File type not allowed");
  }

  return contentType;
}

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
  return await ctx.db.insert("files", {
    siteId: args.siteId,
    kind: "document",
    visibility: "private",
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
    fileId?: string;
    filename: string;
    contentType: string;
    size: number;
    libraryId?: string;
  },
) {
  const entry = await ctx.db
    .query("searchEntries")
    .withIndex("by_source", (q) =>
      q.eq("kind", "document").eq("sourceId", document._id),
    )
    .first();

  if (!entry) {
    return;
  }

  await ctx.db.patch(entry._id, {
    title: document.filename,
    text: document.filename,
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
    const normalizedContentType = validateDocumentUpload({
      siteId,
      objectKey,
      contentType,
      size,
    });

    const siteCtx = await resolveSiteContext(ctx, siteId);
    if (!siteCtx) throw new Error("Site not found");

    const { auth } = await requireOrganizationPermission(
      ctx,
      siteCtx.organizationId,
      { resource: "library", action: "manage" },
    );
    const fileId = await createDocumentAsset(ctx, {
      siteId,
      uploadedBy: auth.userId,
      objectKey,
      filename,
      contentType: normalizedContentType,
      size,
      checksum,
    });

    const documentId = await ctx.db.insert("documents", {
      siteId,
      fileId,
      filename,
      contentType: normalizedContentType,
      size,
      uploadedBy: auth.userId,
      createdAt: Date.now(),
    });

    // Index canonically so it's always findable by filename.
    await ctx.db.insert("searchEntries", {
      siteId,
      kind: "document",
      sourceId: documentId,
      title: filename,
      text: filename,
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
    const normalizedContentType = validateDocumentUpload({
      siteId,
      objectKey,
      contentType,
      size,
    });

    const siteCtx = await resolveSiteContext(ctx, siteId);
    if (!siteCtx) throw new Error("Site not found");

    const { auth } = await requireOrganizationPermission(
      ctx,
      siteCtx.organizationId,
      { resource: "library", action: "manage" },
    );

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

    const fileId = await createDocumentAsset(ctx, {
      siteId,
      uploadedBy: auth.userId,
      objectKey,
      filename,
      contentType: normalizedContentType,
      size,
      checksum,
    });

    const documentId = await ctx.db.insert("documents", {
      siteId,
      libraryId,
      folderId,
      fileId,
      filename,
      contentType: normalizedContentType,
      size,
      uploadedBy: auth.userId,
      createdAt: Date.now(),
    });

    // Index canonically so it's always findable by filename.
    await ctx.db.insert("searchEntries", {
      siteId,
      kind: "document",
      sourceId: documentId,
      title: filename,
      text: filename,
      updatedAt: Date.now(),
    });

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

    await requireOrganizationPermission(ctx, siteCtx.organizationId, {
      resource: "library",
      action: "manage",
    });

    await ctx.db.patch(documentId, { filename });
    await patchDocumentSearchEntry(ctx, { ...document, filename });
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

    await requireOrganizationPermission(ctx, siteCtx.organizationId, {
      resource: "library",
      action: "manage",
    });

    await deleteDocumentRows(ctx, document);
  },
});
