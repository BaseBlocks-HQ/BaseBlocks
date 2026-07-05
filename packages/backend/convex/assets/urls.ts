import type { Id } from "../_generated/dataModel";

export function buildAssetUrl(assetId: Id<"assets">): string {
  return `/api/storage/assets/${assetId}`;
}

export function buildDocumentDownloadUrl(documentId: Id<"documents">): string {
  return `/api/storage/documents/${documentId}`;
}
