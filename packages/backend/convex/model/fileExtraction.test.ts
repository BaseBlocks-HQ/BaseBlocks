import { describe, expect, test } from "bun:test";
import {
  buildFileSearchContent,
  extractionDispatchCapacity,
  extractionExecutionDeadline,
  extractionRetryDelayMs,
  FILE_EXTRACTION_LIMITS,
  fileSourceVersion,
  shouldReuseExtraction,
  validateExtractionInputSize,
  validateExtractionOutput,
  validateStoredSourceMetadata,
} from "./fileExtraction";

describe("file extraction policy", () => {
  test("builds stable source versions and content-only search text", () => {
    expect(
      fileSourceVersion({ objectKey: "a", size: 12, checksum: "sum" }),
    ).toBe("a\u000012\u0000sum");
    expect(buildFileSearchContent("Quarterly revenue")).toBe(
      "Quarterly revenue",
    );
    expect(buildFileSearchContent()).toBe("");
  });

  test("returns structured input and output limit failures", () => {
    expect(validateExtractionInputSize(-1)).toMatchObject({
      code: "invalid_input_size",
      retryable: false,
    });
    expect(validateExtractionInputSize(Number.NaN)).toMatchObject({
      code: "invalid_input_size",
      retryable: false,
    });
    expect(
      validateExtractionInputSize(FILE_EXTRACTION_LIMITS.maxInputBytes + 1),
    ).toMatchObject({
      code: "input_too_large",
      retryable: false,
      limit: FILE_EXTRACTION_LIMITS.maxInputBytes,
    });
    expect(
      validateExtractionOutput(
        "x".repeat(FILE_EXTRACTION_LIMITS.maxOutputChars + 1),
      ),
    ).toMatchObject({ code: "output_too_large", retryable: false });
  });

  test("caps retry backoff", () => {
    expect(extractionRetryDelayMs(1)).toBe(5_000);
    expect(extractionRetryDelayMs(2)).toBe(10_000);
    expect(extractionRetryDelayMs(20)).toBe(60_000);
  });

  test("rejects oversized or changed storage metadata before download", () => {
    expect(
      validateStoredSourceMetadata(
        { size: 10, checksum: "etag-1" },
        { size: FILE_EXTRACTION_LIMITS.maxInputBytes + 1, etag: "etag-1" },
      ),
    ).toMatchObject({ code: "input_too_large", retryable: false });
    expect(
      validateStoredSourceMetadata(
        { size: 10, checksum: "etag-1" },
        { size: 11, etag: "etag-1" },
      ),
    ).toMatchObject({ code: "source_mismatch", actual: 11 });
    expect(
      validateStoredSourceMetadata(
        { size: 10, checksum: "etag-1" },
        { size: 10, etag: "etag-2" },
      ),
    ).toMatchObject({ code: "source_mismatch", retryable: false });
    expect(
      validateStoredSourceMetadata(
        { size: 10, checksum: "etag-1" },
        { size: 10, etag: "etag-1" },
      ),
    ).toBeNull();
    expect(
      validateStoredSourceMetadata(
        {
          size: 10,
          checksum:
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
        },
        { size: 10, etag: "900150983cd24fb0d6963f7d28e17f72" },
      ),
    ).toBeNull();
  });

  test("bounds dispatch capacity and execution deadlines", () => {
    expect(extractionDispatchCapacity(0)).toBe(
      FILE_EXTRACTION_LIMITS.maxConcurrent,
    );
    expect(extractionDispatchCapacity(3)).toBe(1);
    expect(extractionDispatchCapacity(20)).toBe(0);
    expect(extractionExecutionDeadline(1_000)).toBe(
      1_000 + FILE_EXTRACTION_LIMITS.executionDeadlineMs,
    );
  });

  test("reuses only matching completed or active extraction state", () => {
    const base = {
      force: false,
      sourceVersion: "v1",
      existingSourceVersion: "v1",
      hasJob: false,
    };
    expect(shouldReuseExtraction({ ...base, existingStatus: "ready" })).toBe(
      true,
    );
    expect(
      shouldReuseExtraction({
        ...base,
        existingStatus: "ready",
        hasJob: true,
      }),
    ).toBe(false);
    expect(
      shouldReuseExtraction({
        ...base,
        existingStatus: "processing",
        hasJob: true,
      }),
    ).toBe(true);
    expect(
      shouldReuseExtraction({ ...base, existingStatus: "processing" }),
    ).toBe(false);
    expect(
      shouldReuseExtraction({ ...base, existingStatus: "ready", force: true }),
    ).toBe(false);
    expect(
      shouldReuseExtraction({
        ...base,
        existingStatus: "processing",
        hasJob: true,
        force: true,
      }),
    ).toBe(true);
    expect(
      shouldReuseExtraction({
        ...base,
        existingStatus: "ready",
        existingSourceVersion: "v0",
      }),
    ).toBe(false);
  });
});
