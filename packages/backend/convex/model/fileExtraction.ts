import type { Doc } from "../_generated/dataModel";

export const FILE_EXTRACTION_LIMITS = {
  maxInputBytes: 20 * 1024 * 1024,
  maxOutputChars: 200_000,
  maxOutputBytes: 750_000,
  maxAttempts: 3,
  maxConcurrent: 4,
  dispatchScanSize: 12,
  leaseMs: 10 * 60_000,
  executionDeadlineMs: 8 * 60_000,
  storageTimeoutMs: 45_000,
  storageRetries: 1,
} as const;

export type FileExtractionFailure = {
  code: string;
  message: string;
  retryable: boolean;
  limit?: number;
  actual?: number;
};

export function fileSourceVersion(
  file: Pick<Doc<"files">, "objectKey" | "size" | "checksum">,
): string {
  return `${file.objectKey}\u0000${file.size}\u0000${file.checksum ?? ""}`;
}

export function buildFileSearchText(
  filename: string,
  extractedText?: string,
): string {
  return `${filename} ${extractedText ?? ""}`.trim();
}

export function extractionRetryDelayMs(attempt: number): number {
  return Math.min(60_000, 2 ** Math.max(0, attempt - 1) * 5_000);
}

export function extractionDispatchCapacity(processingCount: number): number {
  return Math.max(0, FILE_EXTRACTION_LIMITS.maxConcurrent - processingCount);
}

export function extractionExecutionDeadline(now: number): number {
  return now + FILE_EXTRACTION_LIMITS.executionDeadlineMs;
}

export function shouldReuseExtraction(args: {
  force: boolean;
  sourceVersion: string;
  existingSourceVersion?: string;
  existingStatus?: "queued" | "processing" | "ready" | "failed";
  hasJob: boolean;
}): boolean {
  if (args.existingSourceVersion !== args.sourceVersion) {
    return false;
  }
  if (
    (args.existingStatus === "queued" ||
      args.existingStatus === "processing") &&
    args.hasJob
  ) {
    return true;
  }
  return !args.force && args.existingStatus === "ready" && !args.hasJob;
}

export class ExtractionInputLimitError extends Error {
  readonly actual: number;
  readonly limit: number;

  constructor(actual: number, limit: number) {
    super("Downloaded file exceeds the extraction input limit");
    this.name = "ExtractionInputLimitError";
    this.actual = actual;
    this.limit = limit;
  }
}

export class ExtractionDeadlineError extends Error {
  constructor() {
    super("Extraction storage read exceeded its execution deadline");
    this.name = "ExtractionDeadlineError";
  }
}

async function readBeforeDeadline<T>(
  read: Promise<T>,
  deadlineAt?: number,
): Promise<T> {
  if (deadlineAt === undefined) return read;
  const remaining = deadlineAt - Date.now();
  if (remaining <= 0) throw new ExtractionDeadlineError();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      read,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new ExtractionDeadlineError()),
          remaining,
        );
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

/** Read a storage stream without ever retaining more than the configured cap. */
export async function readExtractionStream(
  stream: ReadableStream<Uint8Array>,
  limit = FILE_EXTRACTION_LIMITS.maxInputBytes,
  deadlineAt?: number,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      try {
        const { done, value } = await readBeforeDeadline(
          reader.read(),
          deadlineAt,
        );
        if (done) break;
        if (!value?.byteLength) continue;
        total += value.byteLength;
        if (total > limit) {
          await reader.cancel("extraction input limit exceeded");
          throw new ExtractionInputLimitError(total, limit);
        }
        chunks.push(value);
      } catch (error) {
        if (!(error instanceof ExtractionInputLimitError)) {
          await reader.cancel("extraction execution deadline exceeded");
        }
        throw error;
      }
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export function validateExtractionInputSize(
  size: number,
): FileExtractionFailure | null {
  if (!Number.isSafeInteger(size) || size < 0) {
    return {
      code: "invalid_input_size",
      message: "File size is not a valid non-negative integer",
      retryable: false,
      actual: size,
    };
  }
  return size > FILE_EXTRACTION_LIMITS.maxInputBytes
    ? {
        code: "input_too_large",
        message: "File exceeds the extraction input limit",
        retryable: false,
        limit: FILE_EXTRACTION_LIMITS.maxInputBytes,
        actual: size,
      }
    : null;
}

export function validateStoredSourceMetadata(
  registered: { size: number; checksum?: string },
  stored: { size: number; etag?: string },
): FileExtractionFailure | null {
  const sizeFailure = validateExtractionInputSize(stored.size);
  if (sizeFailure) return sizeFailure;
  if (stored.size !== registered.size) {
    return {
      code: "source_mismatch",
      message: "Stored file size does not match its registered source version",
      retryable: false,
      actual: stored.size,
    };
  }
  if (
    registered.checksum &&
    stored.etag &&
    !isSha256Checksum(registered.checksum) &&
    stored.etag !== registered.checksum
  ) {
    return {
      code: "source_mismatch",
      message:
        "Stored file checksum does not match its registered source version",
      retryable: false,
    };
  }
  return null;
}

function isSha256Checksum(checksum: string): boolean {
  return /^[a-f\d]{64}$/iu.test(checksum);
}

export function validateDownloadedSourceChecksum(
  registeredChecksum: string | undefined,
  actualSha256: string,
): FileExtractionFailure | null {
  if (
    !registeredChecksum ||
    !isSha256Checksum(registeredChecksum) ||
    registeredChecksum.toLowerCase() === actualSha256.toLowerCase()
  ) {
    return null;
  }
  return {
    code: "source_mismatch",
    message:
      "Stored file checksum does not match its registered source version",
    retryable: false,
  };
}

export function validateExtractionOutput(
  text: string,
): FileExtractionFailure | null {
  if (text.length > FILE_EXTRACTION_LIMITS.maxOutputChars) {
    return {
      code: "output_too_large",
      message: "Extracted text exceeds the character limit",
      retryable: false,
      limit: FILE_EXTRACTION_LIMITS.maxOutputChars,
      actual: text.length,
    };
  }
  const bytes = new TextEncoder().encode(text).byteLength;
  return bytes <= FILE_EXTRACTION_LIMITS.maxOutputBytes
    ? null
    : {
        code: "output_too_large",
        message: "Extracted text exceeds the encoded byte limit",
        retryable: false,
        limit: FILE_EXTRACTION_LIMITS.maxOutputBytes,
        actual: bytes,
      };
}
