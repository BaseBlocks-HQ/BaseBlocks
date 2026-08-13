import { describe, expect, test } from "bun:test";
import { validateOpenEditorCustomBlockEnvelope } from "@openeditor/custom-block";
import { decisionTreeBlock, directoryBlock, quickLinksBlock } from "./index";

const valid = (block: typeof directoryBlock, data: unknown) =>
  validateOpenEditorCustomBlockEnvelope(
    { blockId: block.id, version: block.version, data },
    [block.manifest],
  ).valid;
const link = (url: string, linkType: "website" | "app" = "website") => ({
  id: "link",
  title: "Link",
  url,
  linkType,
});
const staticContext = { renderDocument: () => null, documentToText: () => "" };

describe("BaseBlocks portable contracts", () => {
  test("enforces Directory and Decision Tree relationships", () => {
    const directory = directoryBlock.initialData().directories[0]!;
    expect(
      valid(directoryBlock, {
        directories: [
          {
            ...directory,
            columnIds: ["same", "same"],
            rows: [{ id: "row", cells: { same: "", stray: "" } }],
          },
        ],
      }),
    ).toBe(false);
    expect(
      valid(decisionTreeBlock as typeof directoryBlock, {
        tabsMode: "row",
        trees: [
          {
            id: "tree",
            label: "Tree",
            nodes: [
              {
                id: "node",
                parentId: "missing",
                name: "Node",
                order: 0,
                document: { type: "doc", version: 1, content: [] },
              },
            ],
          },
        ],
      }),
    ).toBe(false);
  });

  test("uses one URL policy for manifests and static output", () => {
    for (const unsafe of [link("javascript:alert(1)"), link("data://x", "app")])
      expect(
        valid(quickLinksBlock as typeof directoryBlock, { links: [unsafe] }),
      ).toBe(false);
    const href = "https://example.com/search?a=1&b=2";
    expect(
      valid(quickLinksBlock as typeof directoryBlock, { links: [link(href)] }),
    ).toBe(true);
    const output = JSON.stringify(
      quickLinksBlock.toHtml({
        ...staticContext,
        data: { links: [link("baseblocks://open", "app"), link(href)] },
      }),
    );
    expect(output).toContain(href);
    expect(output).not.toContain("baseblocks://open");
  });

  test("exports an accessible Directory table", () => {
    const output = JSON.stringify(
      directoryBlock.toHtml({
        ...staticContext,
        data: directoryBlock.initialData(),
      }),
    );
    expect(output).toContain('"tag":"caption"');
    expect(output).toContain('"scope":"col"');
  });
});
