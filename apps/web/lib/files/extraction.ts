import { isExtractableDocumentMimeType } from "@baseblocks/types";

export function isExtractable(contentType: string): boolean {
  return isExtractableDocumentMimeType(contentType);
}

export { extractableDocumentMimeTypes } from "@baseblocks/types";
