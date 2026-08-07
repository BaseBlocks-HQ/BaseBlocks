import { getToken } from "@/lib/auth/server";
import { getServerConvexClient } from "@/lib/convex/server";
import { getFiles } from "@/lib/files/server";
import {
  buildPageExportDocument,
  assertStoredChecksum,
  createPageExportAssetResolver,
  createPageExportFilename,
  isPageExportFormat,
  PageExportAssetError,
  renderPageExport,
} from "./page-export";
import { iterableSource, readSource } from "@baseblocks/anydoc/sources";
import { api } from "@baseblocks/backend";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_EXPORT_ASSET_BYTES = 10 * 1024 * 1024;
const EXPORT_ASSET_DEADLINE_MS = 45_000;

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

    if (!isPageExportFormat(requestedFormat)) {
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

    const exportDocument = buildPageExportDocument({
      pageTitle: result.page.title,
      content: result.content,
    });
    const exportDeadline = Date.now() + EXPORT_ASSET_DEADLINE_MS;
    const exportSignal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(EXPORT_ASSET_DEADLINE_MS),
    ]);

    const assetResolver = createPageExportAssetResolver(
      result.assets,
      async (asset, signal) => {
        const stored = await getFiles().download(asset.objectKey, {
          as: "stream",
          retries: 1,
          signal: signal ?? exportSignal,
          timeout: EXPORT_ASSET_DEADLINE_MS,
        });
        assertStoredChecksum(asset.checksum, stored.etag);
        return (
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
      },
    );
    const exported = await renderPageExport(exportDocument, requestedFormat, {
      assetResolver,
      signal: exportSignal,
    });
    const body =
      typeof exported.data === "string"
        ? new TextEncoder().encode(exported.data)
        : exported.data;
    const filename = createPageExportFilename({
      extension: exported.extension,
      title: exportDocument.title,
    });

    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(body.byteLength),
        "Content-Type": exported.mediaType,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to export page",
      },
      { status: error instanceof PageExportAssetError ? 422 : 500 },
    );
  }
}
