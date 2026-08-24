"use node";

// Bounded document parsing for file extraction. Pure logic with no Convex
// runtime dependencies so it can be unit-tested directly; the extraction
// action in fileExtractionAction.ts supplies storage and mutation plumbing.

import {
  defaultDocumentLimits,
  DocumentPlatformError,
} from "@baseblocks/anydoc-contracts";
import {
  type iterableSource,
  readSource,
} from "@baseblocks/anydoc-contracts/sources";
import * as anydocModule from "@firecrawl/anydoc";

/**
 * Minimal surface of the native AnyDoc parser used by extraction.
 */
export type AnyDocFormat =
  | "csv"
  | "doc"
  | "docx"
  | "epub"
  | "odp"
  | "ods"
  | "odt"
  | "pdf"
  | "ppt"
  | "pptx"
  | "rtf"
  | "xlsx";

interface AnyDocParser {
  formatFromBytes(bytes: Uint8Array): AnyDocFormat | null;
  formatFromExtension(extension: string): AnyDocFormat | null;
  toMarkdownBytes(
    bytes: Uint8Array,
    format?: AnyDocFormat | null,
  ): Promise<string>;
}

const anydoc = anydocModule as unknown as AnyDocParser;

const TEXT_FORMATS = new Set(["markdown", "text"]);

/** Error codes that must never be retried; anything else may be retried. */
export const TERMINAL_ERROR_CODES: ReadonlySet<string> = new Set([
  "encrypted",
  "integrity-failed",
  "invalid-source",
  "invalid-text",
  "malformed",
  "missing-part",
  "output-too-large",
  "processing-failed",
  "resource-limit",
  "source-changed",
  "too-large",
  "too-many-cells",
  "too-many-pages",
  "too-many-slides",
  "unsupported",
]);

export function normalizeFormat(
  value: string | undefined | null,
): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value).toLowerCase().replace(/^\./, "");
}

export function formatFromFilename(
  filename: string | undefined,
): string | undefined {
  if (!filename) return undefined;
  const extension = (
    filename.includes(".")
      ? filename.slice(filename.lastIndexOf("."))
      : filename
  ).toLowerCase();
  if (
    extension === ".md" ||
    extension === ".mdown" ||
    extension === ".markdown"
  ) {
    return "markdown";
  }
  if (extension === ".txt" || extension === ".text") return "text";
  return anydoc.formatFromExtension(extension) ?? undefined;
}

export function formatFromContentType(
  contentType: string | undefined,
): string | undefined {
  const type = contentType?.split(";", 1)[0]?.trim().toLowerCase();
  if (type === "text/markdown" || type === "text/x-markdown") return "markdown";
  if (type === "text/plain") return "text";
  if (type === "text/csv") return "csv";
  return undefined;
}

function decodeTextContent(bytes: Uint8Array, format: string): string {
  try {
    // Strict UTF-8 decoding; invalid text is a terminal failure, not mojibake.
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    throw new DocumentPlatformError("The document is not valid UTF-8 text.", {
      cause,
      code: "invalid-text",
      format,
    });
  }
}

export interface StoredDocumentIngestOptions {
  readonly contentType?: string;
  readonly deadline?: number;
  readonly expectedSha256?: string;
  readonly expectedSize?: number;
  readonly filename?: string;
  readonly format?: string;
  readonly maxBytes?: number;
  readonly maxTextBytes?: number;
  readonly signal?: AbortSignal;
}

/**
 * Bounded one-shot conversion: read the untrusted source under hard limits,
 * detect the format from content signatures, and convert to Markdown with the
 * native AnyDoc parser. Ported from the former @baseblocks/anydoc-ingestion
 * pipeline, reduced to what file extraction needs.
 */
export async function ingestStoredDocument(
  source: ReturnType<typeof iterableSource>,
  options: StoredDocumentIngestOptions = {},
) {
  const maxTextBytes =
    options.maxTextBytes ?? defaultDocumentLimits.maxTextBytes;
  const hintedFormat =
    normalizeFormat(options.format) ??
    formatFromFilename(options.filename) ??
    formatFromContentType(options.contentType);
  const read = await readSource(source, {
    calculateSha256: true,
    ...(options.deadline === undefined ? {} : { deadline: options.deadline }),
    ...(options.expectedSha256 === undefined
      ? {}
      : { expectedSha256: options.expectedSha256 }),
    ...(options.expectedSize === undefined
      ? {}
      : { expectedSize: options.expectedSize }),
    maxBytes:
      options.maxBytes ??
      (TEXT_FORMATS.has(hintedFormat ?? "")
        ? maxTextBytes
        : defaultDocumentLimits.maxBytes),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  });

  const skipSignatureDetection =
    TEXT_FORMATS.has(hintedFormat ?? "") || hintedFormat === "csv";
  const detectedFormat = skipSignatureDetection
    ? undefined
    : normalizeFormat(anydoc.formatFromBytes(read.bytes));
  const format =
    detectedFormat ??
    hintedFormat ??
    formatFromFilename(read.filename) ??
    formatFromContentType(read.contentType);

  if (!format) {
    throw new DocumentPlatformError(
      "The document format could not be detected. Pass format for signature-less input such as CSV or plain text.",
      { code: "invalid-source" },
    );
  }

  let markdown: string;
  if (TEXT_FORMATS.has(format)) {
    markdown = decodeTextContent(read.bytes, format);
  } else {
    try {
      // Text passthrough formats never reach this branch, so `format` is
      // always one of the native parser formats here.
      markdown = await anydoc.toMarkdownBytes(
        read.bytes,
        format as AnyDocFormat,
      );
    } catch (cause) {
      throw new DocumentPlatformError(
        cause instanceof Error ? cause.message : "Document conversion failed.",
        { cause, code: "processing-failed", retryable: false },
      );
    }
  }
  if (typeof markdown !== "string") {
    throw new DocumentPlatformError("The parser returned no Markdown.", {
      code: "processing-failed",
      retryable: false,
    });
  }
  if (new TextEncoder().encode(markdown).byteLength > maxTextBytes) {
    throw new DocumentPlatformError(
      `Extracted Markdown exceeds the ${maxTextBytes.toLocaleString()} byte limit.`,
      { code: "output-too-large", retryable: false },
    );
  }
  return {
    format,
    markdown,
    source: {
      byteLength: read.byteLength,
      sha256: read.sha256,
    },
  };
}

export const DEFAULT_ATTEMPT_TIMEOUT_MS = 120_000;

export function validTimeout(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("attemptTimeoutMs must be a positive integer.");
  }
  return value;
}

export interface IngestAttempt {
  readonly deadline: number;
  readonly signal: AbortSignal;
}

export function createAttempt(
  timeout: number,
  now: () => number,
): {
  aborted: Promise<never>;
  dispose: () => void;
  value: IngestAttempt;
} {
  const controller = new AbortController();
  const deadline = now() + timeout;
  const failure = Object.assign(
    new Error("The ingestion attempt exceeded its deadline."),
    {
      code: "deadline-exceeded",
      retryable: true,
    },
  );
  const timer = setTimeout(() => controller.abort(failure), timeout);
  const aborted = new Promise<never>((_resolve, reject) => {
    controller.signal.addEventListener(
      "abort",
      () => reject(controller.signal.reason),
      {
        once: true,
      },
    );
  });
  return {
    aborted,
    dispose: () => clearTimeout(timer),
    value: { deadline, signal: controller.signal } satisfies IngestAttempt,
  };
}

export interface ClassifiedIngestionFailure {
  readonly code: string;
  readonly terminal: boolean;
}

/** Decide whether a thrown cause ends the retry loop and under which code. */
export function classifyIngestionFailure(
  cause: unknown,
): ClassifiedIngestionFailure {
  const code =
    cause && typeof cause === "object" && "code" in cause
      ? String(cause.code)
      : undefined;
  const retryable =
    cause && typeof cause === "object" && "retryable" in cause
      ? cause.retryable === true
      : undefined;
  const terminal =
    retryable === false ||
    (code !== undefined && TERMINAL_ERROR_CODES.has(code));
  return { code: code ?? "processing-failed", terminal };
}
