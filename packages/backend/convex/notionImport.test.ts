import { describe, expect, test } from "bun:test";
import { notionBlocksToOpenEditor } from "./notionImport";

describe("notionBlocksToOpenEditor", () => {
  test("preserves headings, rich text marks, and grouped lists", () => {
    const document = notionBlocksToOpenEditor(
      [
        {
          id: "heading",
          type: "heading_2",
          heading_2: {
            rich_text: [
              {
                plain_text: "Planning",
                annotations: { bold: true },
              },
            ],
          },
        },
        {
          id: "one",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [{ plain_text: "First" }],
          },
        },
        {
          id: "two",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [{ plain_text: "Second" }],
          },
        },
      ],
      "notion-page",
    );

    expect(document.meta).toEqual({
      source: "notion",
      custom: { sourceId: "notion-page" },
    });
    expect(document.content[0]).toMatchObject({
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "Planning",
          marks: [{ type: "bold" }],
        },
      ],
    });
    expect(document.content[1]).toMatchObject({
      type: "bulletList",
      content: [{ type: "listItem" }, { type: "listItem" }],
    });
  });

  test("keeps nested blocks and represents unsupported content visibly", () => {
    const document = notionBlocksToOpenEditor(
      [
        {
          id: "callout",
          type: "callout",
          callout: {
            icon: { type: "emoji", emoji: "⚠️" },
            rich_text: [{ plain_text: "Read this" }],
          },
          children: [
            {
              id: "nested",
              type: "paragraph",
              paragraph: { rich_text: [{ plain_text: "Nested detail" }] },
            },
          ],
        },
        { id: "unknown", type: "button", button: {} },
      ],
      "notion-page",
    );

    expect(document.content[0]).toMatchObject({
      type: "callout",
      attrs: { emoji: "⚠️" },
      content: [
        { type: "paragraph" },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Nested detail" }],
        },
      ],
    });
    expect(document.content[1]).toMatchObject({
      type: "paragraph",
      content: [{ type: "text", text: "[Unsupported Notion block: button]" }],
    });
  });
});
