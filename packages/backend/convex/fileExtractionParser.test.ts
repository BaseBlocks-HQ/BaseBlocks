import { describe, expect, test } from "bun:test";
import {
  classifyIngestionFailure,
  createAttempt,
  formatFromContentType,
  formatFromFilename,
  ingestStoredDocument,
  TERMINAL_ERROR_CODES,
  validTimeout,
} from "./fileExtractionParser";
import {
  bytesSource,
  iterableSource,
} from "@baseblocks/anydoc-contracts/sources";

const encoder = new TextEncoder();

describe("ingestion failure classification", () => {
  test("explicit retryable=false is terminal regardless of code", () => {
    const classified = classifyIngestionFailure(
      Object.assign(new Error("nope"), {
        code: "fetch-failed",
        retryable: false,
      }),
    );
    expect(classified.terminal).toBe(true);
  });

  test("known terminal codes are terminal without an explicit flag", () => {
    for (const code of TERMINAL_ERROR_CODES) {
      expect(classifyIngestionFailure({ code }).terminal).toBe(true);
    }
  });

  test("retryable codes stay retryable and default to processing-failed", () => {
    expect(
      classifyIngestionFailure({ code: "deadline-exceeded" }).terminal,
    ).toBe(false);
    expect(classifyIngestionFailure({}).code).toBe("processing-failed");
    expect(classifyIngestionFailure(undefined).code).toBe("processing-failed");
  });
});

describe("attempt timeout", () => {
  test("rejects invalid timeouts", () => {
    expect(() => validTimeout(0)).toThrow();
    expect(() => validTimeout(Number.NaN)).toThrow();
    expect(validTimeout(1_000)).toBe(1_000);
  });

  test("aborts with a retryable deadline error after the timeout", async () => {
    const attempt = createAttempt(10, Date.now);
    let reason: unknown;
    try {
      await attempt.aborted;
    } catch (cause) {
      reason = cause;
    }
    expect(reason).toMatchObject({
      code: "deadline-exceeded",
      retryable: true,
    });
    attempt.dispose();
  });
});

describe("format detection", () => {
  test("text extensions win over signature detection", () => {
    expect(formatFromFilename("notes.md")).toBe("markdown");
    expect(formatFromFilename("notes.MDOWN")).toBe("markdown");
    expect(formatFromFilename("notes.txt")).toBe("text");
  });

  test("binary extensions resolve through the parser", () => {
    expect(formatFromFilename("report.docx")).toBe("docx");
    expect(formatFromFilename("slides.pptx")).toBe("pptx");
    expect(formatFromFilename("sheet.xlsx")).toBe("xlsx");
    expect(formatFromFilename("no-extension")).toBeUndefined();
  });

  test("content types map markdown, text, and csv only", () => {
    expect(formatFromContentType("text/markdown; charset=utf-8")).toBe(
      "markdown",
    );
    expect(formatFromContentType("application/pdf")).toBeUndefined();
  });
});

describe("stored document ingestion", () => {
  function sourceFor(text: string) {
    return bytesSource(encoder.encode(text), { filename: "note.txt" });
  }

  test("converts plain text passthrough with source metrics", async () => {
    const result = await ingestStoredDocument(sourceFor("hello verification"), {
      filename: "note.txt",
    });
    expect(result.format).toBe("text");
    expect(result.markdown).toBe("hello verification");
    expect(result.source.byteLength).toBe(18);
    expect(result.source.sha256).toMatch(/^[a-f\d]{64}$/);
  });

  test("enforces the text ceiling during the bounded read", async () => {
    // Text hints cap input at the text ceiling, so oversized text fails in
    // readSource before any conversion work happens.
    await expect(
      ingestStoredDocument(sourceFor("x".repeat(64)), {
        filename: "note.txt",
        maxTextBytes: 16,
      }),
    ).rejects.toMatchObject({ code: "too-large" });
  });

  test("rejects non-UTF-8 text as terminal", async () => {
    await expect(
      ingestStoredDocument(
        bytesSource(new Uint8Array([0xff, 0xfe, 0xfd]), {
          filename: "note.txt",
        }),
        {
          filename: "note.txt",
        },
      ),
    ).rejects.toMatchObject({ code: "invalid-text" });
  });

  test("verifies expected checksums before parsing", async () => {
    await expect(
      ingestStoredDocument(sourceFor("hello"), {
        filename: "note.txt",
        expectedSha256: "0".repeat(64),
      }),
    ).rejects.toMatchObject({ code: "integrity-failed" });
  });

  test("detects CSV by extension hint without signature detection", async () => {
    const csv = "a,b\n1,2\n";
    const result = await ingestStoredDocument(
      iterableSource(
        async () =>
          (async function* () {
            yield encoder.encode(csv);
          })(),
        { size: csv.length },
      ),
      { format: "csv" },
    );
    expect(result.format).toBe("csv");
    // CSV converts to a GFM table.
    expect(result.markdown).toContain("| a | b |");
    expect(result.markdown).toContain("| 1 | 2 |");
  });

  test("fails terminally when no format can be detected", async () => {
    await expect(
      ingestStoredDocument(bytesSource(encoder.encode("???")), {}),
    ).rejects.toMatchObject({ code: "invalid-source" });
  });
});
