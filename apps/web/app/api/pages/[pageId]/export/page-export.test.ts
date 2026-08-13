import { describe, expect, test } from "bun:test";
import {
  createOpenEditorImageAssetResolver,
  exportOpenEditorDocument,
} from "@openeditor/exporters/export";
import { baseBlocksCustomBlocks } from "@baseblocks/custom-blocks";
import { baseBlocksCoreBlocks } from "@baseblocks/openeditor-contracts/core-blocks";
import { createOpenEditorCustomBlockRegistry } from "@openeditor/custom-block";
import { assertStoredChecksum } from "./page-export";

const customBlocks = createOpenEditorCustomBlockRegistry([
  ...baseBlocksCustomBlocks,
  ...baseBlocksCoreBlocks,
]);

const block = (id: string, data: unknown) => ({
  type: "customBlock",
  attrs: {
    "openeditor-id": `test-${id}`,
    blockId: id,
    version: 1,
    data,
  },
});

describe("BaseBlocks page export integration", () => {
  test("exports authorized private image bytes through the OpenEditor facade", async () => {
    const png = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    const asset = {
      fileId: "asset-1",
      filename: "pixel.png",
      contentType: "image/png",
      objectKey: "sites/site-1/assets/pixel.png",
      size: png.byteLength,
      checksum: "snapshot-etag",
    };
    const resolveAsset = createOpenEditorImageAssetResolver({
      lookup: (imageId) => (imageId === asset.fileId ? asset : null),
      load: async (asset) => {
        assertStoredChecksum(asset.checksum, '"snapshot-etag"');
        return {
          data: png,
          fileName: asset.filename,
          mediaType: asset.contentType,
        };
      },
    });

    const exported = await exportOpenEditorDocument(
      {
        type: "doc",
        version: 1,
        content: [
          {
            type: "image",
            attrs: {
              alt: "Pixel",
              imageId: "asset-1",
              src: "https://tracker.invalid/pixel.png",
            },
          },
        ],
      },
      {
        format: "markdown",
        includeTitle: true,
        resolveAsset,
        title: "Images",
      },
    );

    expect(exported.filename).toBe("Images.zip");
    expect(exported.mediaType).toBe("application/zip");
    expect(exported.warnings).toEqual([]);
    expect(exported.data).toBeInstanceOf(Uint8Array);
    expect((exported.data as Uint8Array).slice(0, 4)).toEqual(
      Uint8Array.of(0x50, 0x4b, 0x03, 0x04),
    );
  });

  test("exports registered block data and nested documents", async () => {
    const content = {
      type: "doc" as const,
      version: 1 as const,
      content: [
        block("baseblocks.decision-tree", {
          tabsMode: "row",
          trees: [
            {
              id: "tree",
              label: "Choose a plan",
              nodes: [
                {
                  id: "question",
                  parentId: null,
                  name: "Team size?",
                  order: 0,
                  document: {
                    type: "doc",
                    version: 1,
                    content: [
                      {
                        type: "paragraph",
                        attrs: { "openeditor-id": "context" },
                        content: [{ type: "text", text: "Decision context" }],
                      },
                    ],
                  },
                },
              ],
            },
          ],
        }),
      ],
    };

    const text = await exportOpenEditorDocument(content, {
      customBlocks,
      format: "text",
      title: "Custom blocks",
    });
    const html = await exportOpenEditorDocument(content, {
      customBlocks,
      format: "html",
      title: "Custom blocks",
    });

    expect(text.data).toContain("Decision context");
    expect(html.data).toContain("Decision context");
  });
});
