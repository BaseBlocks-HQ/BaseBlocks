import { describe, expect, test } from "bun:test";
import type { OpenEditorDocument } from "@openeditor/core";
import {
  BaseBlocksCustomBlockAssetAuthorization,
  extractBaseBlocksCustomBlockAssetIds,
} from "./custom-blocks";
import { createBaseBlocksCustomBlockHost } from "./custom-block-host";

const quickLinksWithAsset = (assetId: string) => ({
  type: "customBlock",
  attrs: {
    "openeditor-id": `quick-links-${assetId}`,
    blockId: "baseblocks.quick-links",
    version: 2,
    data: {
      links: [
        {
          id: `link-${assetId}`,
          title: "Documentation",
          url: "https://example.com",
          imageAssetId: assetId,
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

  test("keeps a newly uploaded asset resolvable before the document saves", async () => {
    const document = {
      type: "doc",
      version: 1,
      content: [],
    } as OpenEditorDocument;
    const authorization = new BaseBlocksCustomBlockAssetAuthorization(document);
    const uploaded = authorization.authorize({
      id: "new_image",
      kind: "raster" as const,
      alt: "Preview",
    });

    authorization.updateDocument(document);
    const host = createBaseBlocksCustomBlockHost(authorization);

    expect(uploaded).not.toBeNull();
    expect(await host.assets.resolve(uploaded!.id)).toEqual({
      src: "/api/files/new_image",
      alt: "",
    });
  });

  test("stops authorizing a saved asset after the document removes it", () => {
    const authorization = new BaseBlocksCustomBlockAssetAuthorization({
      type: "doc",
      version: 1,
      content: [quickLinksWithAsset("removed_image")],
    } as OpenEditorDocument);

    expect(authorization.has("removed_image")).toBe(true);
    authorization.updateDocument({
      type: "doc",
      version: 1,
      content: [],
    } as OpenEditorDocument);

    expect(authorization.has("removed_image")).toBe(false);
  });

  test("discards only assets that have not entered the document", () => {
    const authorization = new BaseBlocksCustomBlockAssetAuthorization({
      type: "doc",
      version: 1,
      content: [quickLinksWithAsset("saved_image")],
    } as OpenEditorDocument);
    authorization.authorize({
      id: "pending_image",
      kind: "raster" as const,
      alt: "",
    });

    expect(authorization.discard("saved_image")).toBe(false);
    expect(authorization.discard("pending_image")).toBe(true);
    expect(authorization.has("pending_image")).toBe(false);
  });
});
