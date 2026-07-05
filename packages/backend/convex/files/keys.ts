import type { UploadPurpose } from "@baseblocks/types";

const unsafeFilenamePattern = /[^a-zA-Z0-9._-]+/g;

export function toFilesKind(purpose: UploadPurpose): "documents" | "assets" {
  return purpose === "document" ? "documents" : "assets";
}

export function sanitizeFilename(filename: string): string {
  const normalized = filename
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  const safe = normalized
    .replace(/[\\/]/g, "-")
    .replace(unsafeFilenamePattern, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);

  return safe || "file";
}

export function createFileKey(args: {
  siteId: string;
  purpose: UploadPurpose;
  fileId: string;
  filename: string;
}): string {
  return `sites/${args.siteId}/${toFilesKind(args.purpose)}/${args.fileId}/${sanitizeFilename(args.filename)}`;
}

export function parseFileKey(key: string):
  | {
      siteId: string;
      kind: "documents" | "assets";
      fileId: string;
      filename: string;
    }
  | null {
  const parts = key.split("/");
  if (
    parts.length !== 5 ||
    parts[0] !== "sites" ||
    (parts[2] !== "documents" && parts[2] !== "assets") ||
    !parts[1] ||
    !parts[3] ||
    !parts[4]
  ) {
    return null;
  }

  return {
    siteId: parts[1],
    kind: parts[2],
    fileId: parts[3],
    filename: parts[4],
  };
}
