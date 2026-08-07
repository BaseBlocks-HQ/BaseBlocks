import { describe, expect, test } from "bun:test";
import { richOpenEditorDocument } from "./fixtures/rich-openeditor-document";
import {
  buildPageExportDocument,
  createPageExportFilename,
  renderPageExportDocx,
} from "./page-word-export";

describe("BaseBlocks page Word export adapter", () => {
  test("keeps page metadata separate from the OpenEditor document", async () => {
    const document = buildPageExportDocument({
      content: richOpenEditorDocument,
      pageTitle: "  Product & Strategy  ",
    });

    expect(document).toEqual({
      document: richOpenEditorDocument,
      title: "Product & Strategy",
    });
    expect(
      createPageExportFilename({ title: document.title, format: "docx" }),
    ).toBe("product-strategy.docx");
    expect(
      (await renderPageExportDocx(document)).subarray(0, 2).toString(),
    ).toBe("PK");
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
