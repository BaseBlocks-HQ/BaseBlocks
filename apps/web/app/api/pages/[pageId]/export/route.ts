import { getToken } from "@/lib/auth/server";
import { getServerConvexClient } from "@/lib/convex/server";
import {
  buildPageExportDocument,
  createPageExportFilename,
  isPageExportFormat,
  renderPageExport,
} from "./page-export";
import { api } from "@baseblocks/backend";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

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
      api.published.getPageById,
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

    const exported = await renderPageExport(exportDocument, requestedFormat);
    const body =
      typeof exported.data === "string"
        ? new TextEncoder().encode(exported.data)
        : exported.data;
    const filename = createPageExportFilename({
      title: exportDocument.title,
      format: requestedFormat,
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
      { status: 500 },
    );
  }
}
