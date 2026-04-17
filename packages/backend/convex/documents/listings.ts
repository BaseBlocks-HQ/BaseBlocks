import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { buildDocumentDownloadUrl } from "../storage/paths";

type DocumentListingSource = Pick<
  Doc<"documents">,
  | "_id"
  | "siteId"
  | "libraryId"
  | "folderId"
  | "assetId"
  | "filename"
  | "contentType"
  | "size"
  | "pageCount"
  | "wordCount"
  | "extractionStatus"
  | "extractionError"
  | "uploadedBy"
  | "createdAt"
>;

type DocumentListingDoc = Doc<"documentListings">;

export function buildDocumentListing(document: DocumentListingSource) {
  return {
    documentId: document._id,
    siteId: document.siteId,
    libraryId: document.libraryId,
    folderId: document.folderId,
    assetId: document.assetId,
    filename: document.filename,
    contentType: document.contentType,
    size: document.size,
    pageCount: document.pageCount,
    wordCount: document.wordCount,
    extractionStatus: document.extractionStatus,
    extractionError: document.extractionError,
    uploadedBy: document.uploadedBy,
    createdAt: document.createdAt,
    updatedAt: Date.now(),
  };
}

export function mapDocumentListing(listing: DocumentListingDoc) {
  return {
    _id: listing.documentId,
    _creationTime: listing.createdAt,
    siteId: listing.siteId,
    libraryId: listing.libraryId,
    folderId: listing.folderId,
    assetId: listing.assetId,
    filename: listing.filename,
    contentType: listing.contentType,
    size: listing.size,
    pageCount: listing.pageCount,
    wordCount: listing.wordCount,
    extractionStatus: listing.extractionStatus,
    extractionError: listing.extractionError,
    uploadedBy: listing.uploadedBy,
    createdAt: listing.createdAt,
    downloadUrl: buildDocumentDownloadUrl(listing.documentId),
  };
}

export async function upsertDocumentListing(
  ctx: MutationCtx,
  document: DocumentListingSource,
): Promise<void> {
  const listing = await ctx.db
    .query("documentListings")
    .withIndex("by_document", (q) => q.eq("documentId", document._id))
    .first();

  const listingData = buildDocumentListing(document);
  if (listing) {
    await ctx.db.patch(listing._id, listingData);
    return;
  }

  await ctx.db.insert("documentListings", listingData);
}

export async function deleteDocumentListing(
  ctx: MutationCtx,
  documentId: Doc<"documents">["_id"],
): Promise<void> {
  const listing = await ctx.db
    .query("documentListings")
    .withIndex("by_document", (q) => q.eq("documentId", documentId))
    .first();

  if (listing) {
    await ctx.db.delete(listing._id);
  }
}
