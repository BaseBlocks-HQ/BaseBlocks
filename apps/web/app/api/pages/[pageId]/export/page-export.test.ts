import { describe, expect, test } from "bun:test";
import {
  buildPageExportDocument,
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
          title: document.title,
          format: format as keyof typeof expected,
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
});
