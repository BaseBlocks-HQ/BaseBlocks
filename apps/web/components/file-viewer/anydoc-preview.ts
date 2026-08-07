export type NativeDocumentFormat =
  | "csv"
  | "docx"
  | "markdown"
  | "pdf"
  | "pptx"
  | "text"
  | "xlsx";

const FORMAT_BY_EXTENSION: Readonly<Record<string, NativeDocumentFormat>> = {
  csv: "csv",
  docx: "docx",
  markdown: "markdown",
  md: "markdown",
  pdf: "pdf",
  pptx: "pptx",
  txt: "text",
  xlsx: "xlsx",
};

const FORMAT_BY_CONTENT_TYPE: Readonly<Record<string, NativeDocumentFormat>> = {
  "application/csv": "csv",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "text/csv": "csv",
  "text/markdown": "markdown",
  "text/plain": "text",
  "text/x-markdown": "markdown",
};

const FALLBACK_CONTENT_TYPES = new Set([
  "",
  "application/binary",
  "application/octet-stream",
  "binary/octet-stream",
]);

export const DEFAULT_DOCUMENT_PREVIEW_MAX_BYTES = 100 * 1024 * 1024;

export class DocumentPreviewTooLargeError extends Error {
  override readonly name = "DocumentPreviewTooLargeError";
}

export function resolveNativeDocumentFormat(input: {
  contentType: string;
  filename: string;
}): NativeDocumentFormat | null {
  const contentType =
    input.contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  const contentTypeFormat = FORMAT_BY_CONTENT_TYPE[contentType];
  if (contentTypeFormat) return contentTypeFormat;
  if (contentType.startsWith("text/")) return "text";
  if (!FALLBACK_CONTENT_TYPES.has(contentType)) return null;

  const extension = input.filename.split(".").pop()?.toLowerCase();
  return extension ? (FORMAT_BY_EXTENSION[extension] ?? null) : null;
}

export async function loadBoundedDocument(
  url: string,
  options: {
    fetch?: typeof fetch;
    maxBytes?: number;
    signal?: AbortSignal;
  } = {},
): Promise<ArrayBuffer> {
  const maxBytes = options.maxBytes ?? DEFAULT_DOCUMENT_PREVIEW_MAX_BYTES;
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new TypeError("The document byte limit must be a positive integer.");
  }

  const resolvedUrl = allowedDocumentUrl(url);
  try {
    const result = await readSource(
      webSource(resolvedUrl, {
        allowUrl: (candidate) =>
          allowedDocumentUrl(candidate).protocol !== "blob:",
        fetch: options.fetch,
        request: { credentials: "same-origin" },
      }),
      { maxBytes, signal: options.signal },
    );
    return result.bytes.buffer.slice(
      result.bytes.byteOffset,
      result.bytes.byteOffset + result.bytes.byteLength,
    ) as ArrayBuffer;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : undefined;
    if (code === "too-large") throw documentTooLargeError(maxBytes);
    throw error;
  }
}

function allowedDocumentUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(
      value,
      globalThis.location?.href ?? "https://baseblocks.invalid",
    );
  } catch {
    throw new TypeError("The document URL is invalid.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError(
      `The ${url.protocol} document URL scheme is not allowed.`,
    );
  }
  return url;
}

function documentTooLargeError(maxBytes: number): DocumentPreviewTooLargeError {
  return new DocumentPreviewTooLargeError(
    `Document exceeds the ${Math.floor(maxBytes / (1024 * 1024))} MB preview limit.`,
  );
}
import { readSource, webSource } from "@baseblocks/anydoc/sources";
