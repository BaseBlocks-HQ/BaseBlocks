import { describe, expect, test } from "bun:test";
import { migrateStoredDocument } from "./customBlockMigration";

const valueAt = (
  value: unknown,
  path: readonly (string | number)[],
): unknown => {
  let current = value;
  for (const key of path) {
    if (typeof key === "number") {
      if (!Array.isArray(current)) return undefined;
      current = current[key];
    } else {
      if (!current || typeof current !== "object" || Array.isArray(current))
        return undefined;
      current = (current as Record<string, unknown>)[key];
    }
  }
  return current;
};

describe("final custom block migration", () => {
  test("migrates five atomic nodes and restores structural Page Tabs", () => {
    const nested = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "baseblocksQuickLinks",
          attrs: {
            "openeditor-id": "nested-links",
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
      ],
    };
    const migrated = migrateStoredDocument({
      type: "doc",
      version: 1,
      content: [
        {
          type: "baseblocksDirectory",
          attrs: {
            "openeditor-id": "directory",
            directory: { directories: [] },
          },
        },
        {
          type: "customBlock",
          attrs: {
            "openeditor-id": "tabs",
            blockId: "baseblocks.page-tabs",
            version: 1,
            data: { tabs: [{ id: "tab", label: "Tab", document: nested }] },
          },
        },
      ],
    });
    expect(valueAt(migrated, ["content"])).toHaveLength(1);
    expect(valueAt(migrated, ["content", 0, "type"])).toBe(
      "baseblocksPageTabs",
    );
    expect(
      valueAt(migrated, [
        "content",
        0,
        "attrs",
        "tabs",
        "tabs",
        0,
        "document",
        "content",
        0,
        "attrs",
        "blockId",
      ]),
    ).toBe("baseblocks.directory");
    expect(
      valueAt(migrated, [
        "content",
        0,
        "attrs",
        "tabs",
        "tabs",
        0,
        "document",
        "content",
        1,
        "attrs",
        "blockId",
      ]),
    ).toBe("baseblocks.quick-links");
    expect(
      valueAt(migrated, [
        "content",
        0,
        "attrs",
        "tabs",
        "tabs",
        0,
        "document",
        "content",
        1,
        "attrs",
        "data",
        "links",
        0,
        "artwork",
      ]),
    ).toEqual({
      kind: "asset",
      assetId: "file-1",
    });
  });

  test("does not rewrite a final document", () => {
    const document = {
      type: "doc",
      version: 1,
      content: [{ type: "paragraph", attrs: { "openeditor-id": "p-1" } }],
    };
    expect(migrateStoredDocument(document)).toBe(document);
  });

  test("finishes nested nodes inside a partially migrated custom block", () => {
    const document = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "customBlock",
          attrs: {
            "openeditor-id": "tree",
            blockId: "baseblocks.decision-tree",
            version: 1,
            data: {
              tabsMode: "row",
              trees: [
                {
                  id: "tree",
                  label: "Tree",
                  nodes: [
                    {
                      id: "node",
                      parentId: null,
                      name: "Node",
                      order: 0,
                      document: {
                        type: "doc",
                        version: 1,
                        content: [
                          {
                            type: "baseblocksQuickLinks",
                            attrs: {
                              "openeditor-id": "links",
                              links: [
                                {
                                  id: "docs",
                                  title: "Docs",
                                  url: "/docs",
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              ],
            },
          },
        },
      ],
    };

    const migrated = migrateStoredDocument(document);
    const nestedPath = [
      "content",
      0,
      "attrs",
      "data",
      "trees",
      0,
      "nodes",
      0,
      "document",
      "content",
      0,
    ] as const;
    expect(valueAt(migrated, [...nestedPath, "type"])).toBe("customBlock");
    expect(valueAt(migrated, [...nestedPath, "attrs", "blockId"])).toBe(
      "baseblocks.quick-links",
    );
  });
});
