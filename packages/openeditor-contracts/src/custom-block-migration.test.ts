import { describe, expect, test } from "bun:test";
import { migrateBaseBlocksCustomBlockNodes } from "./custom-block-migration";

const paragraph = { type: "doc", version: 1, content: [] };

describe("BaseBlocks custom block migration", () => {
  test("converts every legacy node and its declared nested documents", () => {
    const migrated = migrateBaseBlocksCustomBlockNodes({
      type: "doc",
      version: 1,
      content: [
        {
          type: "baseblocksSearch",
          attrs: {
            "openeditor-id": "search",
            search: {
              placeholder: "Search",
              maxResults: 10,
              showFileType: true,
            },
          },
        },
        {
          type: "baseblocksLibrary",
          attrs: {
            "openeditor-id": "library",
            library: { libraryId: "library", allowDownloads: true },
          },
        },
        {
          type: "baseblocksDirectory",
          attrs: {
            "openeditor-id": "directory",
            directory: {
              directories: [
                {
                  id: "people",
                  label: "People",
                  columnIds: ["name"],
                  rows: [{ id: "ada", cells: { name: "Ada" } }],
                  pageSize: null,
                },
              ],
            },
          },
        },
        {
          type: "baseblocksDecisionTree",
          attrs: {
            "openeditor-id": "decision",
            decisionTree: {
              trees: [{ id: "tree", label: "Tree", nodes: [] }],
              tabsMode: "row",
            },
          },
        },
        {
          type: "baseblocksQuickLinks",
          attrs: {
            "openeditor-id": "quick-links",
            links: [
              {
                id: "docs",
                title: "Docs",
                url: "/docs",
                imageUrl: "/api/files/file-1",
              },
            ],
          },
        },
        {
          type: "baseblocksPageTabs",
          attrs: {
            "openeditor-id": "page-tabs",
            tabs: {
              tabs: [
                {
                  id: "tab",
                  label: "Tab",
                  document: {
                    ...paragraph,
                    content: [
                      {
                        type: "baseblocksQuickLinks",
                        attrs: {
                          "openeditor-id": "nested-quick-links",
                          links: [],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      ],
    });

    expect(migrated.content.map((node) => node.attrs.blockId)).toEqual([
      "baseblocks.search",
      "baseblocks.library",
      "baseblocks.directory",
      "baseblocks.decision-tree",
      "baseblocks.quick-links",
      "baseblocks.page-tabs",
    ]);
    expect(migrated.content[0].attrs.data).toEqual({
      placeholder: "Search",
      maxResults: 10,
      showFileType: true,
    });
    expect(migrated.content[2].attrs.data.directories[0].label).toBe("People");
    expect(migrated.content[3].attrs.data.trees[0].id).toBe("tree");
    expect(migrated.content[4].attrs.data.links[0].artwork).toEqual({
      kind: "asset",
      assetId: "file-1",
    });
    expect(
      migrated.content[5].attrs.data.tabs[0].document.content[0].attrs.blockId,
    ).toBe("baseblocks.quick-links");
  });

  test("does not rewrite a migrated document", () => {
    const document = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "customBlock",
          attrs: {
            "openeditor-id": "block",
            blockId: "baseblocks.search",
            version: 1,
            data: {
              placeholder: "Search",
              maxResults: 10,
              showFileType: true,
            },
          },
        },
      ],
    };
    expect(migrateBaseBlocksCustomBlockNodes(document)).toBe(document);
  });
});
