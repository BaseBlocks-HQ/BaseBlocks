import { describe, expect, test } from "bun:test";
import {
  getStableDocumentSource,
  loadBoundedDocument,
  resolveNativeDocumentFormat,
} from "./anydoc-preview";

describe("AnyDoc preview format routing", () => {
  test("prefers a specific MIME type over a misleading extension", () => {
    expect(
      resolveNativeDocumentFormat({
        contentType: "application/pdf",
        filename: "proposal.docx",
      }),
    ).toBe("pdf");
  });

  test("uses extensions for generic binary content and supports extensionless text", () => {
    expect(
      resolveNativeDocumentFormat({
        contentType: "application/octet-stream",
        filename: "workbook.xlsx",
      }),
    ).toBe("xlsx");
    expect(
      resolveNativeDocumentFormat({
        contentType: "text/plain; charset=utf-8",
        filename: "README",
      }),
    ).toBe("text");
  });

  test("rejects unsupported formats", () => {
    expect(
      resolveNativeDocumentFormat({
        contentType: "application/zip",
        filename: "archive.zip",
      }),
    ).toBeNull();
    expect(
      resolveNativeDocumentFormat({
        contentType: "application/zip",
        filename: "misleading.pdf",
      }),
    ).toBeNull();
  });
});

describe("bounded document loading", () => {
  test("streams a declared response into one exact buffer", async () => {
    const source = Uint8Array.of(1, 2, 3, 4);
    const result = await loadBoundedDocument(
      "https://files.example/report.pdf",
      {
        fetch: async () =>
          new Response(source, {
            headers: { "content-length": String(source.byteLength) },
          }),
        maxBytes: 8,
      },
    );

    expect(new Uint8Array(result)).toEqual(source);
  });

  test("rejects an oversized declared response before reading it", async () => {
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(Uint8Array.of(1));
        controller.close();
      },
    });

    await expect(
      loadBoundedDocument("https://files.example/report.pdf", {
        fetch: async () =>
          new Response(body, { headers: { "content-length": "9" } }),
        maxBytes: 8,
      }),
    ).rejects.toThrow("preview limit");
  });

  test("cancels a chunked response as soon as it exceeds the limit", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
      start(controller) {
        controller.enqueue(Uint8Array.of(1, 2, 3));
        controller.enqueue(Uint8Array.of(4, 5, 6));
      },
    });

    await expect(
      loadBoundedDocument("https://files.example/report.pdf", {
        fetch: async () => new Response(body),
        maxBytes: 5,
      }),
    ).rejects.toThrow("preview limit");
    expect(cancelled).toBe(true);
  });

  test("blocks active URL schemes before fetching", async () => {
    let fetched = false;
    await expect(
      loadBoundedDocument("javascript:alert(1)", {
        fetch: async () => {
          fetched = true;
          return new Response();
        },
      }),
    ).rejects.toThrow("scheme is not allowed");
    expect(fetched).toBe(false);
  });
});

test("preserves viewer source identity until the loaded buffer changes", () => {
  const source = Uint8Array.of(1, 2, 3).buffer;
  const initial = getStableDocumentSource(source);

  expect(getStableDocumentSource(source)).toBe(initial);
  expect(getStableDocumentSource(source).data).toBe(source);

  const changedSource = Uint8Array.of(1, 2, 3).buffer;
  const changed = getStableDocumentSource(changedSource);
  expect(changed).not.toBe(initial);
  expect(changed.data).toBe(changedSource);
});
