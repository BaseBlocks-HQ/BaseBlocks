import { describe, expect, test } from "bun:test";
import {
  createOpenEditorImageAssetResolver,
  exportOpenEditorDocument,
} from "@openeditor/exporters/export";
import { assertStoredChecksum } from "./page-export";

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
});
