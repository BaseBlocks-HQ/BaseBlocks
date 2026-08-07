import { describe, expect, test } from "bun:test";
import {
  FILE_EXTRACTION_LIMITS,
  fileSourceVersion,
  validateExtractionInputSize,
  validateStoredSourceMetadata,
} from "./fileExtraction";

describe("file extraction policy", () => {
  test("builds stable source versions", () => {
    expect(
      fileSourceVersion({ objectKey: "a", size: 12, checksum: "sum" }),
    ).toBe("a\u000012\u0000sum");
  });

  test("returns structured input limit failures", () => {
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
});
