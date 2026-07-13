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

export async function deleteDocumentRows(
  ctx: MutationCtx,
  document: Doc<"documents">,
): Promise<void> {
  const searchEntry = await ctx.db
    .query("searchEntries")
    .withIndex("by_source", (q) =>
      q.eq("kind", "document").eq("sourceId", document._id),
    )
    .first();
  if (searchEntry) {
    await ctx.db.delete(searchEntry._id);
  }

  if (document.fileId) {
    await ctx.db.delete(document.fileId);
  }

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

async function createDocumentRows(
  ctx: MutationCtx,
  args: {
    siteId: Id<"sites">;
    uploadedBy: string;
    objectKey: string;
    filename: string;
    contentType: string;
    size: number;
    checksum?: string;
    libraryId?: Id<"documentLibraries">;
    folderId?: Id<"documentFolders">;
  },
) {
  const createdAt = Date.now();
  const fileId = await ctx.db.insert("files", {
    siteId: args.siteId,
    kind: "document",
    visibility: "private",
    objectKey: args.objectKey,
    filename: args.filename,
    contentType: args.contentType,
    size: args.size,
    checksum: args.checksum,
    uploadedBy: args.uploadedBy,
    createdAt,
  });
  const documentId = await ctx.db.insert("documents", {
    siteId: args.siteId,
    libraryId: args.libraryId,
    folderId: args.folderId,
    fileId,
    filename: args.filename,
    contentType: args.contentType,
    size: args.size,
    uploadedBy: args.uploadedBy,
    createdAt,
  });
  await ctx.db.insert("searchEntries", {
    siteId: args.siteId,
    kind: "document",
    sourceId: documentId,
    title: args.filename,
    text: args.filename,
    updatedAt: createdAt,
  });
  return documentId;
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
    });

    const siteCtx = await resolveSiteContext(ctx, siteId);
    if (!siteCtx) throw new Error("Site not found");

    const { auth } = await requireOrganizationPermission(
      ctx,
      siteCtx.organizationId,
      { resource: "library", action: "manage" },
    );
    return createDocumentRows(ctx, {
      siteId,
      uploadedBy: auth.userId,
      objectKey,
      filename,
      contentType: normalizedContentType,
      size,
      checksum,
    });
  },
});

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
    });

    const siteCtx = await resolveSiteContext(ctx, siteId);
    if (!siteCtx) throw new Error("Site not found");

    const { auth } = await requireOrganizationPermission(
      ctx,
      siteCtx.organizationId,
      { resource: "library", action: "manage" },
    );

    const library = await ctx.db.get(libraryId);
    if (!library || library.siteId !== siteId) {
      throw new Error("Library not found");
    }

    if (folderId) {
      const folder = await ctx.db.get(folderId);
      if (!folder || folder.libraryId !== libraryId) {
        throw new Error("Folder not found");
      }
    }

    return createDocumentRows(ctx, {
      siteId,
      uploadedBy: auth.userId,
      objectKey,
      filename,
      contentType: normalizedContentType,
      size,
      checksum,
      libraryId,
      folderId,
    });
  },
});

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
