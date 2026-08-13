import { describe, expect, test } from "bun:test";
import { extractOpenEditorText } from "./customBlockIndexing";
import {
  emptyOpenEditorDocument,
  extractOpenEditorReferences,
  hashOpenEditorContent,
  type OpenEditorDocument,
  parseOpenEditorDocument,
  synchronizeOpenEditorChildPages,
} from "./pageContentFormat";

const customBlock = (blockId: string, data: unknown, version = 1) => ({
  type: "customBlock",
  attrs: {
    "openeditor-id": `block-${blockId}-${version}`,
    blockId,
    version,
    data,
  },
});

describe("BaseBlocks OpenEditor persistence", () => {
  test("parses the generic carrier and rejects removed legacy nodes", () => {
    const document = parseOpenEditorDocument({
      type: "doc",
      version: 1,
      content: [
        customBlock("baseblocks.search", {
          placeholder: "Search",
          maxResults: 10,
          showFileType: true,
        }),
      ],
    });
    expect(document.content[0]?.type).toBe("customBlock");
    expect(() =>
      parseOpenEditorDocument({
        type: "doc",
        version: 1,
        content: [{ type: "baseblocksSearch", attrs: {} }],
      }),
    ).toThrow("Unknown node type");
  });

  test("hashes serialized content with a versioned digest", () => {
    expect(hashOpenEditorContent("abc")).toBe(
      "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  test("extracts only references from valid document structure", () => {
    const content = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "attachment",
          attrs: { "openeditor-id": "attachment", attachmentId: "file-1" },
        },
        {
          type: "image",
          attrs: { "openeditor-id": "image", imageId: "image-1" },
        },
        {
          type: "page",
          attrs: { "openeditor-id": "page", pageId: "page-1" },
        },
        customBlock("baseblocks.library", {
          libraryId: "library-1",
          allowDownloads: true,
        }),
        customBlock("baseblocks.quick-links", {
          links: [
            {
              id: "docs",
              title: "Docs",
              url: "/docs",
              linkType: "website",
              artwork: { kind: "asset", assetId: "artwork-1" },
            },
          ],
        }),
        customBlock("example.unavailable", {
          libraryId: "hidden-library",
          lookalike: { type: "image", attrs: { imageId: "hidden-image" } },
        }),
      ],
    } as OpenEditorDocument;

    const references = extractOpenEditorReferences(content);
    expect([...references.attachmentIds]).toEqual(["file-1"]);
    expect([...references.imageIds]).toEqual(["image-1"]);
    expect([...references.customAssetIds]).toEqual(["artwork-1"]);
    expect([...references.libraryIds]).toEqual(["library-1"]);
    expect([...references.pageIds]).toEqual(["page-1"]);
    expect([...references.fileIds]).toEqual(["file-1", "image-1", "artwork-1"]);
  });

  test("synchronizes child pages in the root or leading Page Tabs block", () => {
    const root = synchronizeOpenEditorChildPages(emptyOpenEditorDocument(), [
      { pageId: "child", title: "Child" },
    ]);
    expect(root.content.at(-1)?.attrs?.pageId).toBe("child");

    const tabs = synchronizeOpenEditorChildPages(
      {
        type: "doc",
        version: 1,
        content: [
          customBlock("baseblocks.page-tabs", {
            tabs: [
              {
                id: "tab",
                label: "Tab",
                document: emptyOpenEditorDocument(),
              },
            ],
          }),
        ],
      } as OpenEditorDocument,
      [{ pageId: "child", title: "Child" }],
    );
    const data = tabs.content[0]?.attrs?.data as {
      tabs: Array<{ document: OpenEditorDocument }>;
    };
    expect(data.tabs[0]?.document.content.at(-1)?.attrs?.pageId).toBe("child");
    expect(tabs.content).toHaveLength(1);
  });

  test("indexes visible block text instead of internal identifiers", () => {
    const content = {
      type: "doc",
      version: 1,
      content: [
        customBlock("baseblocks.directory", {
          directories: [
            {
              id: "secret-directory-id",
              label: "People",
              columnIds: ["secret-column-id"],
              rows: [
                { id: "secret-row-id", cells: { "secret-column-id": "Ada" } },
              ],
              pageSize: null,
            },
          ],
        }),
      ],
    } as OpenEditorDocument;
    const text = extractOpenEditorText(content);
    expect(text).toContain("People");
    expect(text).toContain("Ada");
    expect(text).not.toContain("secret-directory-id");
  });
});
