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

  assertAllowedDocumentUrl(url);
  options.signal?.throwIfAborted();
  const response = await (options.fetch ?? globalThis.fetch)(url, {
    credentials: "same-origin",
    signal: options.signal,
  });
  if (!response.ok) {
    throw new Error(`Document request failed (${response.status}).`);
  }

  const declaredSize = parseContentLength(
    response.headers.get("content-length"),
  );
  if (declaredSize !== null && declaredSize > maxBytes) {
    await response.body?.cancel();
    throw documentTooLargeError(maxBytes);
  }
  if (!response.body) {
    throw new Error("The document response has no readable body.");
  }

  const reader = response.body.getReader();
  if (declaredSize !== null) {
    return await readDeclaredLength(reader, declaredSize, maxBytes);
  }
  return await readUnknownLength(reader, maxBytes);
}

function assertAllowedDocumentUrl(value: string): void {
  let url: URL;
  try {
    url = new URL(
      value,
      globalThis.location?.href ?? "https://baseblocks.invalid",
    );
  } catch {
    throw new TypeError("The document URL is invalid.");
  }
  if (
    url.protocol !== "http:" &&
    url.protocol !== "https:" &&
    url.protocol !== "blob:"
  ) {
    throw new TypeError(
      `The ${url.protocol} document URL scheme is not allowed.`,
    );
  }
}

function parseContentLength(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const size = Number(value);
  return Number.isSafeInteger(size) ? size : null;
}

async function readDeclaredLength(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  declaredSize: number,
  maxBytes: number,
): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(declaredSize);
  let offset = 0;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) {
      return offset === bytes.byteLength
        ? bytes.buffer
        : bytes.buffer.slice(0, offset);
    }
    if (offset + chunk.value.byteLength > declaredSize) {
      await reader.cancel();
      throw new Error("The document response exceeded its declared size.");
    }
    if (offset + chunk.value.byteLength > maxBytes) {
      await reader.cancel();
      throw documentTooLargeError(maxBytes);
    }
    bytes.set(chunk.value, offset);
    offset += chunk.value.byteLength;
  }
}

async function readUnknownLength(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  maxBytes: number,
): Promise<ArrayBuffer> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    total += chunk.value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw documentTooLargeError(maxBytes);
    }
    chunks.push(chunk.value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes.buffer;
}

function documentTooLargeError(maxBytes: number): DocumentPreviewTooLargeError {
  return new DocumentPreviewTooLargeError(
    `Document exceeds the ${Math.floor(maxBytes / (1024 * 1024))} MB preview limit.`,
  );
}
