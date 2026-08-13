import { describe, expect, test } from "bun:test";
import type { OpenEditorDocument } from "@openeditor/core";
import { projectBaseBlocksDocumentForPortableExport } from "./portable-export";

describe("portable BaseBlocks export", () => {
  test("leaves ordinary documents unchanged", () => {
    const document = {
      type: "doc",
      version: 1,
      content: [{ type: "paragraph" }],
    } as OpenEditorDocument;
    expect(projectBaseBlocksDocumentForPortableExport(document)).toBe(document);
  });

  test("flattens page tabs into labeled standard blocks", () => {
    const document = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "baseblocksPageTabs",
          attrs: {
            tabs: {
              tabs: [
                {
                  id: "first",
                  label: "Overview",
                  document: {
                    type: "doc",
                    version: 1,
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "One" }],
                      },
                    ],
                  },
                },
                {
                  id: "second",
                  label: "Details",
                  document: {
                    type: "doc",
                    version: 1,
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "Two" }],
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      ],
    } as OpenEditorDocument;

    const projected = projectBaseBlocksDocumentForPortableExport(document);
    expect(projected.content.map(({ type }) => type)).toEqual([
      "heading",
      "paragraph",
      "heading",
      "paragraph",
    ]);
    expect(projected.content[0]?.content?.[0]?.text).toBe("Overview");
    expect(projected.content[2]?.content?.[0]?.text).toBe("Details");
  });
});
