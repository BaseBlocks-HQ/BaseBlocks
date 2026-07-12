import { describe, expect, test } from "bun:test";
import type {
  BlockData,
  PageStructure,
  SpacerContent,
} from "@baseblocks/domain";
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
  test("converts legacy files to canonical attachments without losing metadata", () => {
    const result = convertLegacyPageToOpenEditor(
      pageWithBlocks([
        {
          id: "file-1",
          order: 0,
          type: "file",
          content: {
            documentId: "document-1",
            filename: "brief.pdf",
            contentType: "application/pdf",
            size: 4096,
            createdAt: 123,
          },
        },
      ]),
    );

    expect(result.document.content).toEqual([
      {
        type: "attachment",
        attrs: {
          attachmentId: "document-1",
          name: "brief.pdf",
          mimeType: "application/pdf",
          size: 4096,
          url: "/api/files/document-1",
        },
      },
    ]);
    expect(result.convertedBlockCount).toBe(1);
    expect(result.placeholderCount).toBe(0);
  });

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
    expect(
      result.document.content.every((node) => node.type === "paragraph"),
    ).toBe(true);
    expect(
      result.document.content.every(
        (node) => (node.content?.length ?? 0) === 0,
      ),
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

  test("converts callout text and maps the legacy error variant to danger", () => {
    const result = convertLegacyPageToOpenEditor(
      pageWithBlocks([
        {
          id: "callout",
          order: 0,
          type: "callout",
          content: { text: "Be careful", variant: "error" },
        },
      ]),
    );

    expect(result.document.content[0]).toEqual({
      type: "callout",
      attrs: { tone: "danger" },
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Be careful" }] },
      ],
    });
    expect(result.placeholderCount).toBe(0);
  });

  test("preserves every legacy Mermaid diagram in document order", () => {
    const result = convertLegacyPageToOpenEditor(
      pageWithBlocks([
        {
          id: "flowchart",
          order: 0,
          type: "flowchart",
          content: {
            diagrams: [
              { id: "one", label: "One", mermaidCode: "flowchart LR\nA --> B" },
              {
                id: "two",
                label: "Two",
                mermaidCode: "sequenceDiagram\nA->>B: Hi",
              },
            ],
            tabsMode: "row",
          },
        },
      ]),
    );

    expect(result.document.content).toEqual([
      { type: "mermaidDiagram", attrs: { code: "flowchart LR\nA --> B" } },
      { type: "mermaidDiagram", attrs: { code: "sequenceDiagram\nA->>B: Hi" } },
    ]);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "flattened-diagram-tabs",
        blockId: "flowchart",
      }),
    );
    expect(result.placeholderCount).toBe(0);
  });

  test("converts BaseBlocks-owned directory, search, and library blocks", () => {
    const directory = {
      columns: [{ id: "name", header: "Name", type: "text" as const }],
      rows: [{ id: "row", cells: { name: "Ada" } }],
      settings: { copyMode: "cell" as const, pageSize: 20, showSearch: false },
    };
    const result = convertLegacyPageToOpenEditor(
      pageWithBlocks([
        { id: "directory", order: 0, type: "directory", content: directory },
        {
          id: "search",
          order: 1,
          type: "search",
          content: {
            placeholder: "Find it",
            maxResults: 7,
            showFileType: false,
          },
        },
        {
          id: "library",
          order: 2,
          type: "library",
          content: { libraryId: "library-1", allowDownloads: false },
        },
      ]),
    );

    expect(result.document.content).toEqual([
      { type: "baseblocksDirectory", attrs: { directory } },
      {
        type: "baseblocksSearch",
        attrs: {
          search: {
            placeholder: "Find it",
            maxResults: 7,
            showFileType: false,
          },
        },
      },
      {
        type: "baseblocksLibrary",
        attrs: { library: { libraryId: "library-1", allowDownloads: false } },
      },
    ]);
    expect(result.convertedBlockCount).toBe(3);
    expect(result.placeholderCount).toBe(0);
  });

  test("converts decision-tree option documents to nested OpenEditor documents", () => {
    const result = convertLegacyPageToOpenEditor(
      pageWithBlocks([
        {
          id: "tree",
          order: 0,
          type: "decision-tree",
          content: {
            tabsMode: "dropdown",
            trees: [
              {
                id: "tree-1",
                label: "Troubleshoot",
                nodes: [
                  {
                    id: "node-1",
                    parentId: null,
                    name: "Restart",
                    order: 0,
                    document: [
                      {
                        id: "paragraph-1",
                        type: "paragraph",
                        props: {},
                        content: [
                          {
                            type: "text",
                            text: "Turn it off and on",
                            styles: {},
                          },
                        ],
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ]),
    );

    expect(result.document.content[0]?.type).toBe("baseblocksDecisionTree");
    const decisionTree = result.document.content[0]?.attrs?.decisionTree as {
      trees: Array<{
        nodes: Array<{
          document: { type: string; content: Array<{ type: string }> };
        }>;
      }>;
      tabsMode: string;
    };
    expect(decisionTree.tabsMode).toBe("dropdown");
    expect(decisionTree.trees[0]?.nodes[0]?.document.type).toBe("doc");
    expect(decisionTree.trees[0]?.nodes[0]?.document.content[0]?.type).toBe(
      "paragraph",
    );
    expect(result.convertedBlockCount).toBe(1);
    expect(result.placeholderCount).toBe(0);
  });

  test("converts legacy page references to the first-party Page primitive", () => {
    const result = convertLegacyPageToOpenEditor(
      pageWithBlocks([
        {
          id: "page-block",
          order: 0,
          type: "page",
          content: { pageId: "child-page" },
        },
      ]),
      { pageTitles: new Map([["child-page", "Child page"]]) },
    );

    expect(result.document.content[0]).toEqual({
      type: "page",
      attrs: { pageId: "child-page", icon: "📄", href: null },
      content: [{ type: "text", text: "Child page" }],
    });
    expect(result.convertedBlockCount).toBe(1);
    expect(result.placeholderCount).toBe(0);
  });
});
