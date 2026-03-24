export type UploadPurpose = "document" | "siteAsset";

export const supportedUploadMimeTypes = [
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
  "application/pdf",
  "application/rtf",
  "application/vnd.oasis.opendocument.presentation",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "text/html",
  "text/markdown",
  "text/plain",
] as const;

export const extractableDocumentMimeTypes = [
  "application/pdf",
  "application/rtf",
  "application/vnd.oasis.opendocument.presentation",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "text/html",
  "text/markdown",
  "text/plain",
] as const;

const supportedUploadMimeTypeSet = new Set<string>(supportedUploadMimeTypes);
const extractableDocumentMimeTypeSet = new Set<string>(
  extractableDocumentMimeTypes,
);

export function normalizeMimeType(contentType: string): string | null {
  const normalized = contentType.split(";")[0]?.trim().toLowerCase();
  return normalized || null;
}

export function isSupportedUploadMimeType(contentType: string): boolean {
  const normalized = normalizeMimeType(contentType);
  return normalized ? supportedUploadMimeTypeSet.has(normalized) : false;
}

export function isExtractableDocumentMimeType(contentType: string): boolean {
  const normalized = normalizeMimeType(contentType);
  return normalized ? extractableDocumentMimeTypeSet.has(normalized) : false;
}
