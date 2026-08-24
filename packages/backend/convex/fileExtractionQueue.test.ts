import { describe, expect, test } from "bun:test";
import {
  decodeConvexIngestionFailure,
  encodeConvexIngestionFailure,
} from "./fileExtractionQueue";

describe("Convex ingestion failure codec", () => {
  test("round-trips code, message, retryability, and format", () => {
    const cause = Object.assign(new Error("The document is encrypted."), {
      code: "encrypted",
      retryable: false,
      format: "pdf",
    });
    const decoded = decodeConvexIngestionFailure(
      encodeConvexIngestionFailure(cause),
    );
    expect(decoded).toMatchObject({
      version: 1,
      kind: "anydoc-ingestion-failure",
      code: "encrypted",
      message: "The document is encrypted.",
      retryable: false,
      format: "pdf",
    });
  });

  test("decodes Workpool failed results", () => {
    const encoded = encodeConvexIngestionFailure(
      Object.assign(new Error("boom"), { code: "too-large", retryable: false }),
    );
    const decoded = decodeConvexIngestionFailure({
      kind: "failed",
      error: encoded,
    });
    expect(decoded?.code).toBe("too-large");
  });

  test("collects limit fields through the cause chain", () => {
    const inner = Object.assign(new Error("limit"), { maxBytes: 100 });
    const outer = new Error("wrap", { cause: inner });
    const decoded = decodeConvexIngestionFailure(
      encodeConvexIngestionFailure(
        Object.assign(outer, { code: "resource-limit", retryable: false }),
      ),
    );
    expect(decoded?.limits).toMatchObject({ maxBytes: 100 });
  });

  test("ignores non-failure strings and malformed payloads", () => {
    expect(decodeConvexIngestionFailure("plain error text")).toBeUndefined();
    expect(decodeConvexIngestionFailure(undefined)).toBeUndefined();
    expect(decodeConvexIngestionFailure({ kind: "canceled" })).toBeUndefined();
    const forged =
      "ANYDOC_FAILURE_V1:" + encodeURIComponent(JSON.stringify({ version: 9 }));
    expect(decodeConvexIngestionFailure(forged)).toBeUndefined();
    expect(
      decodeConvexIngestionFailure("ANYDOC_FAILURE_V1:%7Bnot-json"),
    ).toBeUndefined();
  });

  test("bounds oversized messages and unknown limit keys are dropped", () => {
    const cause = Object.assign(new Error("x".repeat(10_000)), {
      code: "processing-failed",
      retryable: true,
      notALimitKey: 1,
    });
    const decoded = decodeConvexIngestionFailure(
      encodeConvexIngestionFailure(cause),
    );
    expect(decoded).toBeDefined();
    expect(Array.from(decoded!.message).length).toBeLessThanOrEqual(2_048);
    expect(decoded?.limits).toBeUndefined();
  });
});
