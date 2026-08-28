import { describe, expect, test } from "bun:test";
import {
  extractOpenEditorReferences,
  extractOpenEditorText,
  hashOpenEditorContent,
  emptyOpenEditorDocument,
  type OpenEditorDocument,
  parseOpenEditorDocument,
  referencesOpenEditorPage,
  synchronizeOpenEditorChildPages,
} from "./pageContentFormat";

import { fingerprintOpenEditorDocument } from "@openeditor/core";
import { baseBlocksBlockRegistry } from "@baseblocks/openeditor-contracts/block-registry";

describe("hashOpenEditorContent", () => {
  test("writes a versioned SHA-256 digest", () => {
    expect(hashOpenEditorContent("abc")).toBe(
      "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("parseOpenEditorDocument", () => {
  test("accepts a supported versioned document", () => {
    const document = parseOpenEditorDocument({
      type: "doc",
      version: 1,
      content: [
        { type: "paragraph", attrs: { "openeditor-id": "paragraph-1" } },
      ],
    });
    expect(document).toMatchObject({
      type: "doc",
      version: 1,
      content: [
        { type: "paragraph", attrs: { "openeditor-id": "paragraph-1" } },
      ],
    });
    expect(document.content[0]?.attrs?.["openeditor-id"]).toBe("paragraph-1");
  });

  test("decodes persisted JSON before strict parsing", () => {
    const document = parseOpenEditorDocument(
      JSON.stringify({
        type: "doc",
        version: 1,
        content: [
          { type: "paragraph", attrs: { "openeditor-id": "paragraph-1" } },
        ],
      }),
    );

    expect(document).toMatchObject({
      type: "doc",
      version: 1,
      content: [
        { type: "paragraph", attrs: { "openeditor-id": "paragraph-1" } },
      ],
    });
  });

  test("rejects unknown document versions", () => {
    expect(() =>
      parseOpenEditorDocument({ type: "doc", version: 2, content: [] }),
    ).toThrow("Document version must be 1");
  });

  test("rejects unversioned ProseMirror documents", () => {
    expect(() => parseOpenEditorDocument({ type: "doc", content: [] })).toThrow(
      "Document version must be 1",
    );
  });

  test("accepts registered BaseBlocks blocks through one strict carrier", () => {
    const document = parseOpenEditorDocument({
      type: "doc",
      version: 1,
      content: [
        {
          type: "customBlock",
          attrs: {
            "openeditor-id": "directory-1",
            blockId: "baseblocks.directory",
            version: 2,
            data: {
              directories: [
                {
                  id: "directory",
                  label: "Directory",
                  columns: [{ id: "name", name: "Name" }],
                  rows: [{ id: "row", cells: { name: "Ada" } }],
                  pageSize: 25,
                },
              ],
            },
          },
        },
      ],
    });

    expect(document.content[0]?.type).toBe("customBlock");
    expect(document.content[0]?.attrs?.blockId).toBe("baseblocks.directory");
  });

  test("accepts version 1 directory blocks through the registered migration", () => {
    const document = parseOpenEditorDocument({
      type: "doc",
      version: 1,
      content: [
        {
          type: "customBlock",
          attrs: {
            "openeditor-id": "directory-legacy-1",
            blockId: "baseblocks.directory",
            version: 1,
            data: {
              directories: [
                {
                  id: "directory",
                  label: "Directory",
                  columnIds: ["name"],
                  rows: [{ id: "row", cells: { name: "Ada" } }],
                  pageSize: null,
                },
              ],
            },
          },
        },
      ],
    });

    const resolved = baseBlocksBlockRegistry.resolve(document.content[0]!);
    expect(resolved.status).toBe("ready");
    if (resolved.status !== "ready") return;
    expect(resolved.migrated).toBe(true);
    expect(resolved.data).toMatchObject({
      directories: [
        {
          columns: [{ id: "name", name: "Column 1" }],
          rows: [{ id: "row", cells: { name: "Ada" } }],
        },
      ],
    });
  });

  test("rejects unsupported block versions and malformed block data", () => {
    expect(() =>
      parseOpenEditorDocument({
        type: "doc",
        version: 1,
        content: [
          {
            type: "customBlock",
            attrs: {
              "openeditor-id": "directory-1",
              blockId: "baseblocks.directory",
              version: 3,
              data: { directories: [] },
            },
          },
        ],
      }),
    ).toThrow("Stored version 3 is newer");
    expect(() =>
      parseOpenEditorDocument({
        type: "doc",
        version: 1,
        content: [
          {
            type: "customBlock",
            attrs: {
              "openeditor-id": "search-1",
              blockId: "baseblocks.search",
              version: 1,
              data: {
                placeholder: "Search",
                maxResults: 500,
                showFileType: true,
              },
            },
          },
        ],
      }),
    ).toThrow("Search maximum results must be between 1 and 50");
  });

  test("rejects all removed legacy block node types", () => {
    for (const type of [
      "baseblocksDirectory",
      "baseblocksDecisionTree",
      "baseblocksQuickLinks",
      "baseblocksSearch",
      "baseblocksLibrary",
    ])
      expect(() =>
        parseOpenEditorDocument({
          type: "doc",
          version: 1,
          content: [{ type, attrs: { "openeditor-id": `${type}-1` } }],
        }),
      ).toThrow("Unknown node type");
  });

  test("rejects legacy nodes inside custom-block document fields", () => {
    expect(() =>
      parseOpenEditorDocument({
        type: "doc",
        version: 1,
        content: [
          {
            type: "customBlock",
            attrs: {
              "openeditor-id": "tree-1",
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
                              type: "baseblocksDirectory",
                              attrs: {
                                "openeditor-id": "legacy-directory",
                                directory: {},
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
      }),
    ).toThrow();
  });

  test("rejects node types that are not in the configured product schema", () => {
    expect(() =>
      parseOpenEditorDocument({
        type: "doc",
        version: 1,
        content: [
          {
            type: "inventedAgentBlock",
            attrs: { "openeditor-id": "invented-1" },
          },
        ],
      }),
    ).toThrow("Unknown node type");
  });
});

describe("emptyOpenEditorDocument", () => {
  test("has a deterministic stable-node fingerprint", () => {
    expect(fingerprintOpenEditorDocument(emptyOpenEditorDocument())).toBe(
      fingerprintOpenEditorDocument(emptyOpenEditorDocument()),
    );
  });
});

describe("extractOpenEditorText", () => {
  test("uses block-owned text and does not duplicate nested tab content", () => {
    const document = parseOpenEditorDocument({
      type: "doc",
      version: 1,
      content: [
        {
          type: "baseblocksPageTabs",
          attrs: {
            "openeditor-id": "tabs",
            tabs: {
              tabs: [
                {
                  id: "tab",
                  label: "Resources",
                  document: {
                    type: "doc",
                    version: 1,
                    content: [
                      {
                        type: "customBlock",
                        attrs: {
                          "openeditor-id": "links",
                          blockId: "baseblocks.quick-links",
                          version: 2,
                          data: {
                            links: [
                              {
                                id: "docs",
                                title: "Documentation",
                                url: "/docs",
                              },
                            ],
                          },
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

    expect(extractOpenEditorText(document)).toBe(
      "Resources Documentation: /docs",
    );
  });
});

describe("referencesOpenEditorPage", () => {
  test("finds a page referenced by an OpenEditor page block", () => {
    const content: OpenEditorDocument = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "page",
          attrs: { pageId: "page-2", icon: "🚕" },
          content: [{ type: "text", text: "Process taxi" }],
        },
      ],
    };

    expect(referencesOpenEditorPage(content, "page-2")).toBe(true);
    expect(referencesOpenEditorPage(content, "page-3")).toBe(false);
  });

  test("ignores pageId attributes on other block types", () => {
    const content: OpenEditorDocument = {
      type: "doc",
      version: 1,
      content: [{ type: "paragraph", attrs: { pageId: "page-2" } }],
    };

    expect(referencesOpenEditorPage(content, "page-2")).toBe(false);
  });
});

describe("extractOpenEditorReferences", () => {
  test("keeps attachment and image identities typed while indexing both as files", () => {
    const content = parseOpenEditorDocument({
      type: "doc",
      version: 1,
      content: [
        {
          type: "attachment",
          attrs: {
            "openeditor-id": "attachment-1",
            attachmentId: "file-1",
            name: "Guide",
            mimeType: null,
            size: null,
            url: null,
          },
        },
        {
          type: "image",
          attrs: {
            "openeditor-id": "image-1",
            imageId: "asset-1",
            src: null,
            alt: "",
            width: null,
            height: null,
          },
        },
        {
          type: "page",
          attrs: {
            "openeditor-id": "page-reference-1",
            pageId: "page-2",
            icon: null,
            href: null,
          },
          content: [{ type: "text", text: "Referenced page" }],
        },
      ],
    });

    const references = extractOpenEditorReferences(content);
    expect([...references.attachmentIds]).toEqual(["file-1"]);
    expect([...references.imageIds]).toEqual(["asset-1"]);
    expect([...references.customAssetIds]).toEqual([]);
    expect([...references.fileIds]).toEqual(["file-1", "asset-1"]);
    expect([...references.pageIds]).toEqual(["page-2"]);
  });

  test("indexes image assets referenced by custom blocks as files", () => {
    const content = parseOpenEditorDocument({
      type: "doc",
      version: 1,
      content: [
        {
          type: "customBlock",
          attrs: {
            "openeditor-id": "quick-links-1",
            blockId: "baseblocks.quick-links",
            version: 2,
            data: {
              links: [
                {
                  id: "link-1",
                  title: "Docs",
                  url: "https://example.com",
                  imageAssetId: "custom-image-1",
                },
              ],
            },
          },
        },
      ],
    });

    const references = extractOpenEditorReferences(content);
    expect([...references.customAssetIds]).toEqual(["custom-image-1"]);
    expect([...references.fileIds]).toEqual(["custom-image-1"]);
  });
});

describe("synchronizeOpenEditorChildPages", () => {
  test("adds missing children and removes stale or duplicate page blocks", () => {
    const document = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "page",
          attrs: {
            "openeditor-id": "old-a",
            pageId: "child-a",
            icon: null,
            href: null,
          },
          content: [{ type: "text", text: "Old title" }],
        },
        {
          type: "page",
          attrs: {
            "openeditor-id": "duplicate-a",
            pageId: "child-a",
            icon: null,
            href: null,
          },
          content: [{ type: "text", text: "Duplicate" }],
        },
        {
          type: "page",
          attrs: {
            "openeditor-id": "stale",
            pageId: "not-a-child",
            icon: null,
            href: null,
          },
          content: [{ type: "text", text: "Stale" }],
        },
      ],
    } as OpenEditorDocument;

    const synchronized = synchronizeOpenEditorChildPages(document, [
      { pageId: "child-a", title: "Child A", icon: "🅰️" },
      { pageId: "child-b", title: "Child B" },
    ]);

    expect(synchronized.content).toEqual([
      {
        type: "page",
        attrs: {
          "openeditor-id": "page-child-a",
          pageId: "child-a",
          icon: "🅰️",
          href: "?page=child-a",
        },
        content: [{ type: "text", text: "Child A" }],
      },
      {
        type: "page",
        attrs: {
          "openeditor-id": "page-child-b",
          pageId: "child-b",
          icon: "📄",
          href: "?page=child-b",
        },
        content: [{ type: "text", text: "Child B" }],
      },
    ]);
  });

  test("adds missing children to the first tab document", () => {
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
                  id: "tab-1",
                  label: "Tab 1",
                  document: emptyOpenEditorDocument(),
                },
              ],
            },
          },
        },
      ],
    } as OpenEditorDocument;

    const synchronized = synchronizeOpenEditorChildPages(document, [
      { pageId: "child-a", title: "Child A" },
    ]);
    const tabs = synchronized.content[0]?.attrs?.tabs as {
      tabs: Array<{ document: OpenEditorDocument }>;
    };

    expect(tabs.tabs[0]?.document.content.at(-1)?.attrs?.pageId).toBe(
      "child-a",
    );
    expect(synchronized.content).toHaveLength(1);
  });
});
