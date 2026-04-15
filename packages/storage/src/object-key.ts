import type { UploadPurpose } from "@baseblocks/types";

function sanitizeFilename(filename: string): string {
  const trimmed = filename.trim();
  if (!trimmed) {
    return "file";
  }

  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function createObjectKey(args: {
  siteId: string;
  purpose: UploadPurpose;
  filename: string;
}): string {
  const now = new Date();
  const month = `${now.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${now.getUTCDate()}`.padStart(2, "0");
  const datePrefix = `${now.getUTCFullYear()}/${month}/${day}`;
  const id = crypto.randomUUID();

  return [
    "sites",
    args.siteId,
    args.purpose === "document" ? "documents" : "assets",
    datePrefix,
    `${id}-${sanitizeFilename(args.filename)}`,
  ].join("/");
}

export function toAttachmentContentDisposition(filename: string): string {
  return `attachment; filename="${sanitizeFilename(filename)}"`;
}
