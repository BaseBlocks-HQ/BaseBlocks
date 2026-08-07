import { describe, expect, test } from "bun:test";
import {
  buildPageExportDocument,
  createPageExportFilename,
  renderPageExport,
} from "./page-word-export";

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

describe("BaseBlocks page Word export adapter", () => {
  test("keeps page metadata separate from the OpenEditor document", async () => {
    const document = buildPageExportDocument({
      content: sourceDocument,
      pageTitle: "  Product & Strategy  ",
    });

    expect(document).toEqual({
      document: sourceDocument,
      title: "Product & Strategy",
    });
    expect(
      createPageExportFilename({ title: document.title, format: "docx" }),
    ).toBe("product-strategy.docx");
    expect(
      new TextDecoder().decode(
        (await renderPageExport(document, "docx")).data.subarray(0, 2),
      ),
    ).toBe("PK");
    expect((await renderPageExport(document, "markdown")).data).toBe(
      "# Product & Strategy\n\nA portable export",
    );
    expect(
      createPageExportFilename({ title: document.title, format: "markdown" }),
    ).toBe("product-strategy.md");
  });

  test("rejects content that is not an OpenEditor document", () => {
    expect(() =>
      buildPageExportDocument({
        content: { content: ["legacy text"] },
        pageTitle: "Legacy",
      }),
    ).toThrow("Page content is not a valid OpenEditor document");
  });
});
