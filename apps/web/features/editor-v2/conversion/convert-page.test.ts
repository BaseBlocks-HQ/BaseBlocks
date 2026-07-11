import { describe, expect, test } from "bun:test";
import type { BlockData, PageStructure, SpacerContent } from "@baseblocks/domain";
import { convertLegacyPageToOpenEditor } from "./convert-page";

const pageWithBlocks = (blocks: BlockData[]): PageStructure => ({
  tabs: [],
  sections: [
    {
      id: "section",
      order: 0,
      region: "main",
      columns: [{ id: "column", order: 0, blocks }],
    },
  ],
});

const spacer = (
  id: string,
  order: number,
  height: SpacerContent["height"],
): BlockData => ({ id, order, type: "spacer", content: { height } });

describe("legacy page conversion", () => {
  test.each([
    ["small", 1],
    ["medium", 2],
    ["large", 3],
    ["xlarge", 4],
  ] as const)("normalizes a %s spacer to %i empty paragraphs", (height, count) => {
    const result = convertLegacyPageToOpenEditor(
      pageWithBlocks([spacer(`spacer-${height}`, 0, height)]),
    );

    expect(result.document.content).toHaveLength(count);
    expect(result.document.content.every((node) => node.type === "paragraph")).toBe(
      true,
    );
    expect(
      result.document.content.every((node) => (node.content?.length ?? 0) === 0),
    ).toBe(true);
    expect(result.placeholderCount).toBe(0);
    expect(result.convertedBlockCount).toBe(1);
    expect(result.warnings).toContainEqual({
      code: "normalized-spacer",
      severity: "info",
      blockId: `spacer-${height}`,
      blockType: "spacer",
      message: `Legacy ${height} spacer was converted to ${count} empty ${count === 1 ? "paragraph" : "paragraphs"}.`,
    });
  });

  test("preserves surrounding content order without retaining a spacer or placeholder", () => {
    const result = convertLegacyPageToOpenEditor(
      pageWithBlocks([
        {
          id: "after",
          order: 2,
          type: "paragraph",
          content: { text: "After" },
        },
        spacer("space", 1, "medium"),
        {
          id: "before",
          order: 0,
          type: "paragraph",
          content: { text: "Before" },
        },
      ]),
    );

    expect(result.document.content.map((node) => node.type)).toEqual([
      "paragraph",
      "paragraph",
      "paragraph",
      "paragraph",
    ]);
    expect(result.document.content[0]?.content?.[0]?.text).toBe("Before");
    expect(result.document.content[3]?.content?.[0]?.text).toBe("After");
    expect(
      result.document.content.some(
        (node) =>
          node.type === "spacer" ||
          node.type === "baseblocks.spacer" ||
          node.type === "baseblocksMigrationPlaceholder",
      ),
    ).toBe(false);
    expect(result.placeholderCount).toBe(0);
  });
});
