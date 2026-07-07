export type UploadPurpose = "document" | "siteAsset";

export const supportedUploadMimeTypes = [
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
  "application/msword",
  "application/pdf",
  "application/json",
  "application/rtf",
  "application/xml",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.oasis.opendocument.presentation",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "text/css",
  "text/html",
  "text/javascript",
  "text/markdown",
  "text/plain",
] as const;

const supportedUploadMimeTypeSet = new Set<string>(supportedUploadMimeTypes);

const uploadMimeTypeByExtension: Record<string, string> = {
  avif: "image/avif",
  csv: "text/csv",
  css: "text/css",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  gif: "image/gif",
  htm: "text/html",
  html: "text/html",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "text/javascript",
  json: "application/json",
  md: "text/markdown",
  odp: "application/vnd.oasis.opendocument.presentation",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odt: "application/vnd.oasis.opendocument.text",
  pdf: "application/pdf",
  png: "image/png",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  rtf: "application/rtf",
  svg: "image/svg+xml",
  txt: "text/plain",
  webp: "image/webp",
  xml: "application/xml",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

const extensionPreferredMimeTypes = new Set([
  "application/msword",
  "application/octet-stream",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/zip",
  "application/x-zip-compressed",
  "binary/octet-stream",
]);

export function normalizeMimeType(contentType: string): string | null {
  const normalized = contentType.split(";")[0]?.trim().toLowerCase();
  return normalized || null;
}

export function getUploadMimeTypeForFilename(filename: string): string | null {
  const extension = filename.split(".").pop()?.trim().toLowerCase();
  return extension ? (uploadMimeTypeByExtension[extension] ?? null) : null;
}

export function resolveUploadMimeType(args: {
  filename: string;
  contentType?: string | null;
}): string {
  const normalized = normalizeMimeType(args.contentType ?? "");
  const extensionType = getUploadMimeTypeForFilename(args.filename);

  if (
    normalized &&
    isSupportedUploadMimeType(normalized) &&
    !extensionPreferredMimeTypes.has(normalized)
  ) {
    return normalized;
  }

  return extensionType ?? normalized ?? "application/octet-stream";
}

export function isSupportedUploadMimeType(contentType: string): boolean {
  const normalized = normalizeMimeType(contentType);
  return normalized ? supportedUploadMimeTypeSet.has(normalized) : false;
}
