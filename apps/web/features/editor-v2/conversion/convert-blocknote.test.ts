import { describe, expect, test } from "bun:test";
import type { PageStructure } from "@baseblocks/domain";
import { convertBlockNoteDocument } from "./convert-blocknote";
import { convertLegacyPageToOpenEditor } from "./convert-page";

const text = (value: string, styles: Record<string, unknown> = {}) => ({
  type: "text",
  text: value,
  styles,
});

const block = (
  id: string,
  type: string,
  content: unknown = [],
  props: Record<string, unknown> = {},
  children: unknown[] = [],
) => ({ id, type, props, content, children });

describe("BlockNote to Open Editor conversion", () => {
  test("converts text blocks, styles, and links", () => {
    const result = convertBlockNoteDocument([
      block("heading", "heading", [text("Title")], { level: 3 }),
      block("paragraph", "paragraph", [
        text("Bold", { bold: true }),
        {
          type: "link",
          href: "https://example.com",
          content: [text(" link", { italic: true })],
        },
      ]),
      block("divider", "divider"),
    ]);

    expect(result.nodes.map((node) => node.type)).toEqual([
      "heading",
      "paragraph",
      "horizontalRule",
    ]);
    expect(result.nodes[0]?.attrs?.level).toBe(3);
    expect(result.nodes[1]?.content?.[0]?.marks).toEqual([{ type: "bold" }]);
    expect(result.nodes[1]?.content?.[1]?.marks).toEqual([
      { type: "link", attrs: { href: "https://example.com" } },
      { type: "italic" },
    ]);
  });

  test("regroups consecutive list items and preserves nested lists", () => {
    const result = convertBlockNoteDocument([
      block("one", "bulletListItem", [text("One")], {}, [
        block("nested", "bulletListItem", [text("Nested")]),
      ]),
      block("two", "bulletListItem", [text("Two")]),
      block("task", "checkListItem", [text("Done")], { checked: true }),
    ]);

    expect(result.nodes.map((node) => node.type)).toEqual([
      "bulletList",
      "taskList",
    ]);
    expect(result.nodes[0]?.content).toHaveLength(2);
    expect(result.nodes[0]?.content?.[0]?.content?.[1]?.type).toBe(
      "bulletList",
    );
    expect(result.nodes[1]?.content?.[0]?.attrs?.checked).toBe(true);
  });

  test("converts BlockNote tables and localizes unsupported media", () => {
    const result = convertBlockNoteDocument([
      block("table", "table", {
        type: "tableContent",
        headerRows: 1,
        rows: [
          { cells: [[text("Name")], [text("Value")]] },
          { cells: [[text("OpenEditor")], [text("V2")]] },
        ],
      }),
      block("video", "video", undefined, {
        url: "https://example.com/video.mp4",
      }),
    ]);

    expect(result.nodes[0]?.type).toBe("table");
    expect(result.nodes[0]?.content?.[0]?.content?.[0]?.type).toBe(
      "tableHeader",
    );
    expect(result.nodes[1]?.type).toBe("baseblocksMigrationPlaceholder");
    expect(result.nodes[1]?.attrs?.sourceType).toBe("richtext:video");
    expect(result.placeholderCount).toBe(1);
  });

  test("removes the legacy richtext wrapper and splices converted nodes in place", () => {
    const page: PageStructure = {
      tabs: [],
      sections: [
        {
          id: "section",
          order: 0,
          region: "main",
          columns: [
            {
              id: "column",
              order: 0,
              blocks: [
                {
                  id: "before",
                  order: 0,
                  type: "paragraph",
                  content: { text: "Before" },
                },
                {
                  id: "rich",
                  order: 1,
                  type: "richtext",
                  content: {
                    document: [
                      block("inside-heading", "heading", [text("Inside")], {
                        level: 2,
                      }),
                      block("inside-paragraph", "paragraph", [text("Content")]),
                    ],
                  },
                },
                {
                  id: "after",
                  order: 2,
                  type: "paragraph",
                  content: { text: "After" },
                },
              ],
            },
          ],
        },
      ],
    };

    const result = convertLegacyPageToOpenEditor(page);
    expect(result.document.content.map((node) => node.type)).toEqual([
      "paragraph",
      "heading",
      "paragraph",
      "paragraph",
    ]);
    expect(
      result.document.content.some((node) => node.type === "richtext"),
    ).toBe(false);
    expect(result.convertedBlockCount).toBe(3);
  });
});
