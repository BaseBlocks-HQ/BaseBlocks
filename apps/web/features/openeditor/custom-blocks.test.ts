import { describe, expect, test } from "bun:test";
import type { OpenEditorDocument } from "@openeditor/core";
import { extractBaseBlocksCustomBlockAssetIds } from "./custom-blocks";

const quickLinksWithAsset = (assetId: string) => ({
  type: "customBlock",
  attrs: {
    "openeditor-id": `quick-links-${assetId}`,
    blockId: "baseblocks.quick-links",
    version: 1,
    data: {
      links: [
        {
          id: `link-${assetId}`,
          title: "Documentation",
          url: "https://example.com",
          linkType: "website",
          artwork: { kind: "asset", assetId },
        },
      ],
    },
  },
});

describe("custom-block asset authorization", () => {
  test("finds assets in top-level and nested block documents", () => {
    const document = {
      type: "doc",
      version: 1,
      content: [
        quickLinksWithAsset("top_asset"),
        {
          type: "baseblocksPageTabs",
          attrs: {
            "openeditor-id": "tabs",
            tabs: {
              tabs: [
                {
                  id: "tab",
                  label: "Tab",
                  document: {
                    type: "doc",
                    version: 1,
                    content: [quickLinksWithAsset("nested_asset")],
                  },
                },
              ],
            },
          },
        },
      ],
    } as OpenEditorDocument;

    expect(extractBaseBlocksCustomBlockAssetIds(document)).toEqual(
      new Set(["top_asset", "nested_asset"]),
    );
  });
});
