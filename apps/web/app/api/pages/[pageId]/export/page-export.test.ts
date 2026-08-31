import { describe, expect, test } from "bun:test";
import {
  createOpenEditorImageAssetResolver,
  exportOpenEditorDocument,
} from "@openeditor/export/export";
import { projectBaseBlocksDocumentForPortableExport } from "@baseblocks/openeditor-contracts";
import {
  assertStoredChecksum,
  detectRasterMediaType,
  isFatalExportWarning,
} from "./page-export";

function zipEntryNames(data: Uint8Array): string[] {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const decoder = new TextDecoder();
  const names: string[] = [];

  for (let offset = 0; offset + 46 <= data.byteLength; offset += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) continue;
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const nameStart = offset + 46;
    names.push(
      decoder.decode(data.subarray(nameStart, nameStart + nameLength)),
    );
    offset += 46 + nameLength + extraLength + commentLength - 1;
  }

  return names;
}

describe("BaseBlocks page export integration", () => {
  test("detects raster bytes when stored metadata is stale", () => {
    expect(detectRasterMediaType(Uint8Array.of(0xff, 0xd8, 0xff, 0xe0))).toBe(
      "image/jpeg",
    );
    expect(
      detectRasterMediaType(
        Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
      ),
    ).toBe("image/png");
  });

  test("allows exports to omit unavailable image bytes", () => {
    expect(isFatalExportWarning("asset_unavailable")).toBe(false);
    expect(isFatalExportWarning("asset_rejected")).toBe(true);
    expect(isFatalExportWarning("unsafe_url")).toBe(true);
  });

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

  test("exports quick-link image assets into DOCX media entries", async () => {
    const png = Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      ),
      (character) => character.charCodeAt(0),
    );
    const asset = {
      fileId: "quick-link-image",
      filename: "quick-link.png",
      contentType: "image/png",
      checksum: '"snapshot-etag"',
    };
    const document = {
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
                  url: "https://example.com/docs",
                  imageAssetId: asset.fileId,
                },
              ],
            },
          },
        },
      ],
    } as const;
    let loaded = 0;
    const resolveAsset = createOpenEditorImageAssetResolver({
      lookup: (imageId) => (imageId === asset.fileId ? asset : null),
      load: async () => {
        loaded += 1;
        return {
          data: png,
          fileName: asset.filename,
          mediaType: asset.contentType,
        };
      },
    });

    const exported = await exportOpenEditorDocument(
      projectBaseBlocksDocumentForPortableExport(document, {
        imageAssetIds: new Set([asset.fileId]),
      }),
      {
        format: "docx",
        resolveAsset,
        title: "Quick Links",
      },
    );

    expect(exported.warnings).toEqual([]);
    expect(loaded).toBe(1);
    expect(
      zipEntryNames(exported.data as Uint8Array).some((name) =>
        name.startsWith("word/media/"),
      ),
    ).toBe(true);
  });
});
