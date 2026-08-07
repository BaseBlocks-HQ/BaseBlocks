import type { Doc } from "../_generated/dataModel";

export const FILE_EXTRACTION_LIMITS = {
  maxInputBytes: 20 * 1024 * 1024,
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

export function buildFileSearchContent(extractedText?: string): string {
  return extractedText?.trim() ?? "";
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
