import type { Doc } from "../_generated/dataModel";
import { buildDocumentDownloadUrl } from "../assets/urls";

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
