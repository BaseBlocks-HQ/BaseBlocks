import { isExtractableDocumentMimeType } from "@baseblocks/types";

/**
 * Check if a content type supports text extraction
 */
export function isExtractable(contentType: string): boolean {
  return isExtractableDocumentMimeType(contentType);
}
