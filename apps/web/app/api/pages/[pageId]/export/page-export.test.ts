import { describe, expect, test } from "bun:test";
import {
  assertStoredChecksum,
  buildPageExportDocument,
  createPageExportAssetResolver,
  createPageExportFilename,
  isPageExportFormat,
  renderPageExport,
} from "./page-export";

const sourceDocument = {
  type: "doc" as const,
  version: 1 as const,
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "A portable export" }],
    },
  ],
};

describe("BaseBlocks page export adapter", () => {
  test("enforces snapshotted ETags while deferring SHA-256 to the byte reader", () => {
    expect(() => assertStoredChecksum('"etag-1"', "etag-1")).not.toThrow();
    expect(() =>
      assertStoredChecksum(
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "provider-etag",
      ),
    ).not.toThrow();
    expect(() => assertStoredChecksum("etag-1", "etag-2")).toThrow(
      "does not match its release snapshot",
    );
  });

  test("exports the same OpenEditor document to every supported format", async () => {
    const document = buildPageExportDocument({
      content: sourceDocument,
      pageTitle: "  Product & Strategy  ",
    });
    const expected = {
      docx: {
        extension: "docx",
        mediaType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      html: { extension: "html", mediaType: "text/html; charset=utf-8" },
      json: { extension: "json", mediaType: "application/json" },
      markdown: { extension: "md", mediaType: "text/markdown; charset=utf-8" },
      text: { extension: "txt", mediaType: "text/plain; charset=utf-8" },
    } as const;

    for (const [format, metadata] of Object.entries(expected)) {
      const exported = await renderPageExport(
        document,
        format as keyof typeof expected,
      );
      expect(exported.extension).toBe(metadata.extension);
      expect(exported.mediaType).toBe(metadata.mediaType);
      expect(
        createPageExportFilename({
          extension: metadata.extension,
          title: document.title,
        }),
      ).toBe(`product-strategy.${metadata.extension}`);
    }
    expect((await renderPageExport(document, "markdown")).data).toBe(
      "# Product & Strategy\n\nA portable export",
    );
    expect((await renderPageExport(document, "html")).data).toContain(
      "<h1>Product &amp; Strategy</h1>",
    );
    expect(
      new TextDecoder().decode(
        (await renderPageExport(document, "docx")).data.subarray(0, 2),
      ),
    ).toBe("PK");
  });

  test("validates formats and rejects legacy content", () => {
    expect(isPageExportFormat("json")).toBe(true);
    expect(isPageExportFormat("pdf")).toBe(false);
    expect(() =>
      buildPageExportDocument({
        content: { content: ["legacy text"] },
        pageTitle: "Legacy",
      }),
    ).toThrow("Page content is not a valid OpenEditor document");
  });

  test("exports authorized image bytes without retaining an external URL", async () => {
    const imageDocument = buildPageExportDocument({
      content: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "image",
            attrs: {
              alt: "Pixel",
              height: 1,
              imageId: "asset-1",
              src: "https://tracker.invalid/pixel.png",
              width: 1,
            },
          },
        ],
      },
      pageTitle: "Images",
    });
    const png = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    const assetResolver = createPageExportAssetResolver(
      [
        {
          fileId: "asset-1",
          filename: "pixel.png",
          contentType: "image/png",
          objectKey: "sites/site-1/assets/pixel.png",
          size: png.byteLength,
        },
      ],
      async () => png,
    );

    const resolved = await assetResolver(imageDocument.document.content[0], {
      path: [0],
    });
    expect(resolved).toEqual(
      expect.objectContaining({
        data: png,
        fileName: "pixel.png",
        mediaType: "image/png",
      }),
    );

    const exported = await renderPageExport(imageDocument, "markdown", {
      assetResolver,
    });
    expect(exported.binary).toBe(true);
    expect(exported.extension).toBe("zip");
    expect(exported.mediaType).toBe("application/zip");
    expect(exported.data).toBeInstanceOf(Uint8Array);
    expect(exported.data.slice(0, 4)).toEqual(
      Uint8Array.of(0x50, 0x4b, 0x03, 0x04),
    );
  });
});
