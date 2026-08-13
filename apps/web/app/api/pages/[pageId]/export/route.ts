import { getToken } from "@/lib/auth/server";
import { getServerConvexClient } from "@/lib/convex/server";
import { getFiles } from "@/lib/files/server";
import { assertStoredChecksum, type PageExportAsset } from "./page-export";
import { iterableSource, readSource } from "@baseblocks/anydoc/sources";
import { api } from "@baseblocks/backend";
import { projectBaseBlocksDocumentForPortableExport } from "@baseblocks/openeditor-contracts";
import { baseBlocksBlockRegistry } from "@baseblocks/openeditor-contracts/block-registry";
import { isOpenEditorDocument } from "@openeditor/core";
import {
  createOpenEditorImageAssetResolver,
  exportOpenEditorDocument,
  openEditorExportFormats,
} from "@openeditor/exporters/export";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_EXPORT_ASSET_BYTES = 10 * 1024 * 1024;
const EXPORT_ASSET_DEADLINE_MS = 45_000;
const ASSET_FAILURE_CODES = new Set([
  "asset_rejected",
  "asset_unavailable",
  "unsafe_url",
]);

function expectedSha256(checksum: string | undefined): string | undefined {
  return checksum && /^[a-f\d]{64}$/iu.test(checksum)
    ? checksum.toLowerCase()
    : undefined;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ pageId: string }> },
) {
  try {
    const { pageId } = await context.params;
    const requestedFormat = request.nextUrl.searchParams.get("format");
    const format = openEditorExportFormats.find(
      (candidate) => candidate === requestedFormat,
    );

    if (!format) {
      return NextResponse.json(
        { error: "Unsupported export format" },
        { status: 400 },
      );
    }

    const token = await getToken();
    const result = await getServerConvexClient(token).query(
      api.published.getPageExport,
      {
        pageId: pageId as never,
      },
    );

    if (!result) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    if (!isOpenEditorDocument(result.content)) {
      throw new TypeError("Page content is not a valid OpenEditor document");
    }
    const title = result.page.title.trim() || "Untitled page";
    const exportDeadline = Date.now() + EXPORT_ASSET_DEADLINE_MS;
    const exportSignal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(EXPORT_ASSET_DEADLINE_MS),
    ]);

    const assetsById = new Map<string, PageExportAsset>(
      result.assets.map((asset: PageExportAsset) => [asset.fileId, asset]),
    );
    const assetResolver = createOpenEditorImageAssetResolver({
      lookup: (imageId) => assetsById.get(imageId) ?? null,
      load: async (asset, { signal }) => {
        const stored = await getFiles().download(asset.objectKey, {
          as: "stream",
          retries: 1,
          signal: signal ?? exportSignal,
          timeout: EXPORT_ASSET_DEADLINE_MS,
        });
        assertStoredChecksum(asset.checksum, stored.etag);
        const data = (
          await readSource(
            iterableSource(() => stored.stream(), {
              contentType: asset.contentType,
              filename: asset.filename,
              id: asset.objectKey,
              size: stored.size,
            }),
            {
              deadline: exportDeadline,
              expectedSha256: expectedSha256(asset.checksum),
              expectedSize: asset.size,
              maxBytes: MAX_EXPORT_ASSET_BYTES,
              signal: signal ?? exportSignal,
            },
          )
        ).bytes;
        return {
          data,
          fileName: asset.filename,
          mediaType: asset.contentType,
        };
      },
    });
    const exportDocument =
      format === "json"
        ? result.content
        : projectBaseBlocksDocumentForPortableExport(result.content);
    const exported = await exportOpenEditorDocument(exportDocument, {
      format,
      includeTitle: true,
      resolveAsset: assetResolver,
      signal: exportSignal,
      title,
      customBlocks: baseBlocksBlockRegistry,
    });
    if (
      exported.warnings.some((warning) => ASSET_FAILURE_CODES.has(warning.code))
    ) {
      return NextResponse.json(
        { error: "One or more page images could not be exported safely." },
        { status: 422 },
      );
    }
    const body =
      typeof exported.data === "string"
        ? new TextEncoder().encode(exported.data)
        : exported.data;

    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(exported.filename)}`,
        "Content-Length": String(body.byteLength),
        "Content-Type": exported.mediaType,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to export page",
      },
      { status: 500 },
    );
  }
}
