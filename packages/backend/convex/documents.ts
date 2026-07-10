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
import {
  deleteObjectAction,
  getFilesBucketName,
  getFilesMaxUploadSize,
  getFilesProviderName,
} from "./files";
import { canAccessPublishedSite } from "./sharing";
import { getActiveLibraryIds, resolveSiteContext } from "./sites";

export function buildAssetUrl(assetId: Id<"assets">): string {
  return `/api/storage/assets/${assetId}`;
}

export function buildDocumentDownloadUrl(documentId: Id<"documents">): string {
  return `/api/storage/documents/${documentId}`;
}

type SearchMetadata = Doc<"searchableContent">["metadata"];

export function buildDocumentSearchMetadata(args: {
  documentId: string;
  assetId?: string;
  filename: string;
  contentType: string;
  size: number;
  libraryId?: string;
}): SearchMetadata {
  return {
    assetId: args.assetId as SearchMetadata["assetId"],
    filename: args.filename,
    fileContentType: args.contentType,
    size: args.size,
    downloadUrl: buildDocumentDownloadUrl(args.documentId as never),
    libraryId: args.libraryId,
  };
}

export function normalizeDocumentSearchMetadata(args: {
  sourceId: string;
  metadata: SearchMetadata;
}): SearchMetadata {
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
 *   1. Remove the searchableContent index entry.
 *   2. Delete the assets row.
 *   3. Delete the document row.
 *   4. Schedule the object deletion (runs after the transaction commits).
 */

export async function deleteDocumentRows(
  ctx: MutationCtx,
  document: Doc<"documents">,
): Promise<void> {
  // 1. Remove search index entry
  const searchEntry = await ctx.db
    .query("searchableContent")
    .withIndex("by_source", (q) =>
      q.eq("contentType", "document").eq("sourceId", document._id),
    )
    .first();
  if (searchEntry) {
    await ctx.db.delete(searchEntry._id);
  }

  // 2. Capture asset before deleting it
  const asset = document.assetId ? await ctx.db.get(document.assetId) : null;

  // 3. Delete the asset record
  if (document.assetId) {
    await ctx.db.delete(document.assetId);
  }

  // 4. Delete the document record
  await ctx.db.delete(document._id);

  // 5. Schedule file deletion (fire-and-forget, after DB commit)
  if (asset) {
    await ctx.scheduler.runAfter(0, deleteObjectAction, {
      objectKey: asset.objectKey,
    });
  }
}

function mapDocument(doc: Doc<"documents">) {
  const downloadUrl = buildDocumentDownloadUrl(doc._id);
  return {
    ...doc,
    downloadUrl,
  };
}

async function listDocumentsForSite(
  ctx: Pick<GenericQueryCtx<DataModel>, "db">,
  siteId: Id<"sites">,
) {
  const documents = await ctx.db
    .query("documents")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .collect();
  return documents.map(mapDocument);
}

async function listDocumentsForLibrary(
  ctx: Pick<GenericQueryCtx<DataModel>, "db">,
  libraryId: Id<"documentLibraries">,
) {
  const documents = await ctx.db
    .query("documents")
    .withIndex("by_folder", (q) => q.eq("libraryId", libraryId))
    .collect();
  return documents.map(mapDocument);
}

async function listDocumentsForFolder(
  ctx: Pick<GenericQueryCtx<DataModel>, "db">,
  libraryId: Id<"documentLibraries">,
  folderId: Id<"documentFolders"> | undefined,
) {
  const documents = await ctx.db
    .query("documents")
    .withIndex("by_folder", (q) =>
      q.eq("libraryId", libraryId).eq("folderId", folderId),
    )
    .collect();
  return documents.map(mapDocument);
}

async function isPublishedFileBlockDocument(
  ctx: Pick<GenericQueryCtx<DataModel>, "db">,
  document: Doc<"documents">,
) {
  const contents = await ctx.db
    .query("pageContents")
    .withIndex("by_site", (q) => q.eq("siteId", document.siteId))
    .collect();

  for (const content of contents) {
    for (const section of content.sections)
      for (const column of section.columns) {
        if (
          column.blocks.some(
            (block) =>
              block.type === "file" &&
              block.content?.documentId === document._id,
          )
        )
          return true;
      }
  }

  return false;
}

/**
 * Format search result.
 */
function formatSearchResult(document: Doc<"documents">, matchType: "filename") {
  return {
    _id: document._id,
    filename: document.filename,
    contentType: document.contentType,
    size: document.size,
    downloadUrl: buildDocumentDownloadUrl(document._id),
    libraryId: document.libraryId,
    matchType,
    snippet: null,
    snippetMatchStart: null,
    snippetMatchEnd: null,
  };
}

/**
 * Core search logic shared between authenticated and public queries
 * @param activeLibraryIds - If provided, only return documents from these libraries (for public search filtering)
 */
async function performSearch(
  ctx: Pick<GenericQueryCtx<DataModel>, "db">,
  siteId: Id<"sites">,
  searchTerm: string,
  limit: number,
  activeLibraryIds?: string[],
) {
  const filenameResults = await ctx.db
    .query("documents")
    .withSearchIndex("search_filename", (q) =>
      q.search("filename", searchTerm).eq("siteId", siteId),
    )
    .take(limit * 2);

  const seen = new Set<string>();
  const combined: ReturnType<typeof formatSearchResult>[] = [];

  const getVisibleDocument = (doc: Doc<"documents">) => {
    if (!activeLibraryIds) return doc;
    if (!doc.libraryId) return null;
    return activeLibraryIds.includes(doc.libraryId) ? doc : null;
  };

  for (const doc of filenameResults) {
    if (!seen.has(doc._id)) {
      const visibleDocument = getVisibleDocument(doc);
      if (!visibleDocument) continue;
      seen.add(doc._id);
      combined.push(formatSearchResult(visibleDocument, "filename"));
    }
  }

  return combined.slice(0, limit);
}

export const list = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return [];

    await requireOrganizationMember(ctx, site.organizationId);
    return await listDocumentsForSite(ctx, siteId);
  },
});

export const get = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc) return null;

    const site = await ctx.db.get(doc.siteId);
    if (!site) return null;

    await requireOrganizationMember(ctx, site.organizationId);
    return mapDocument(doc);
  },
});

export const search = query({
  args: {
    siteId: v.id("sites"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { siteId, query: searchQuery, limit = 20 }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return [];

    await requireOrganizationMember(ctx, site.organizationId);

    const trimmed = searchQuery.trim();
    if (!trimmed) return [];

    return performSearch(ctx, siteId, trimmed, limit);
  },
});

export const searchPublic = query({
  args: {
    siteId: v.id("sites"),
    query: v.string(),
    limit: v.optional(v.number()),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (
    ctx,
    { siteId, query: searchQuery, limit = 20, sessionTokens },
  ) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return [];

    const site = await ctx.db.get(siteId);
    if (!site || !(await canAccessPublishedSite(ctx, site, sessionTokens))) {
      return [];
    }

    const activeLibraryIds = await getActiveLibraryIds(ctx, siteId);

    // Use shared search logic with active library filter
    return performSearch(
      ctx,
      siteId,
      trimmed,
      limit,
      Array.from(activeLibraryIds),
    );
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

    const activeLibraryIds = await getActiveLibraryIds(ctx, siteId);
    const allDocs = await listDocumentsForSite(ctx, siteId);

    return allDocs
      .filter((doc) => doc.libraryId && activeLibraryIds.has(doc.libraryId))
      .map((doc) => ({
        ...doc,
        downloadUrl: doc.downloadUrl,
      }));
  },
});

export const listByLibrary = query({
  args: { libraryId: v.id("documentLibraries") },
  handler: async (ctx, { libraryId }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site) return [];

    await requireOrganizationMember(ctx, site.organizationId);
    return await listDocumentsForLibrary(ctx, libraryId);
  },
});

export const listByFolder = query({
  args: {
    libraryId: v.id("documentLibraries"),
    folderId: v.optional(v.id("documentFolders")),
  },
  handler: async (ctx, { libraryId, folderId }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site) return [];

    await requireOrganizationMember(ctx, site.organizationId);
    return await listDocumentsForFolder(ctx, libraryId, folderId);
  },
});

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

    const activeLibraryIds = await getActiveLibraryIds(ctx, library.siteId);
    if (!activeLibraryIds.has(libraryId)) return [];
    return await listDocumentsForLibrary(ctx, libraryId);
  },
});

export const listByFolderPublic = query({
  args: {
    libraryId: v.id("documentLibraries"),
    folderId: v.optional(v.id("documentFolders")),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { libraryId, folderId, sessionTokens }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site || !(await canAccessPublishedSite(ctx, site, sessionTokens))) {
      return [];
    }

    const activeLibraryIds = await getActiveLibraryIds(ctx, library.siteId);
    if (!activeLibraryIds.has(libraryId)) return [];
    return await listDocumentsForFolder(ctx, libraryId, folderId);
  },
});

export const searchByLibrary = query({
  args: {
    libraryId: v.id("documentLibraries"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { libraryId, query: searchQuery, limit = 20 }) => {
    const library = await ctx.db.get(libraryId);
    if (!library) return [];

    const site = await ctx.db.get(library.siteId);
    if (!site) return [];

    await requireOrganizationMember(ctx, site.organizationId);

    const trimmed = searchQuery.trim();
    if (!trimmed) return [];

    const filenameResults = await ctx.db
      .query("documents")
      .withSearchIndex("search_filename", (q) =>
        q.search("filename", trimmed).eq("siteId", site._id),
      )
      .take(limit * 2);

    const seen = new Set<string>();
    const combined: ReturnType<typeof formatSearchResult>[] = [];

    for (const doc of filenameResults) {
      if (seen.has(doc._id)) continue;
      if (doc.libraryId !== libraryId) continue;
      seen.add(doc._id);
      combined.push(formatSearchResult(doc, "filename"));
    }

    return combined.slice(0, limit);
  },
});

export const getDownloadAsset = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const document = await ctx.db.get(documentId);
    if (!document) {
      return null;
    }

    const site = await ctx.db.get(document.siteId);
    if (!site) {
      return null;
    }

    await requireOrganizationMember(ctx, site.organizationId);

    if (!document.assetId) {
      return null;
    }

    const asset = await ctx.db.get(document.assetId);
    if (!asset) {
      return null;
    }

    return {
      documentId: document._id,
      filename: document.filename,
      contentType: document.contentType,
      size: document.size,
      bucket: asset.bucket,
      objectKey: asset.objectKey,
    };
  },
});

export const getPublicDownloadAsset = query({
  args: {
    documentId: v.id("documents"),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { documentId, sessionTokens }) => {
    const document = await ctx.db.get(documentId);
    if (!document?.assetId) {
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

    const asset = await ctx.db.get(document.assetId);
    if (!asset) {
      return null;
    }

    return {
      documentId: document._id,
      filename: document.filename,
      contentType: document.contentType,
      size: document.size,
      bucket: asset.bucket,
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

  const maxUploadSize = getFilesMaxUploadSize();
  if (maxUploadSize !== null && args.size > maxUploadSize) {
    throw new Error("File is too large");
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
  return await ctx.db.insert("assets", {
    siteId: args.siteId,
    kind: "document",
    visibility: "private",
    provider: getFilesProviderName(),
    bucket: getFilesBucketName(),
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
    extractedText: document.filename,
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
    const assetId = await createDocumentAsset(ctx, {
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
      assetId,
      filename,
      contentType: normalizedContentType,
      size,
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
        contentType: normalizedContentType,
        size,
      }),
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

    const assetId = await createDocumentAsset(ctx, {
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
      assetId,
      filename,
      contentType: normalizedContentType,
      size,
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
        contentType: normalizedContentType,
        size,
        libraryId,
      }),
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

    const siteCtx = await resolveSiteContext(ctx, document.siteId);
    if (!siteCtx) throw new Error("Site not found");

    await requireOrganizationPermission(ctx, siteCtx.organizationId, {
      resource: "library",
      action: "manage",
    });

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
