// Content types that support extraction
const EXTRACTABLE_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.presentation",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/rtf",
  "text/plain",
  "text/markdown",
  "text/html",
]);

/**
 * Check if a content type supports text extraction
 */
export function isExtractable(contentType: string): boolean {
  const normalized = contentType.split(";")[0]?.trim().toLowerCase();
  return normalized ? EXTRACTABLE_TYPES.has(normalized) : false;
}
