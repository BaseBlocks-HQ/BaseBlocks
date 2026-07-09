import { getServerConvexClient } from "@/app/_convex/server";
import { getRequestAccessSessionTokens } from "@/modules/public-site/access-session";
import {
  buildPageExportText,
  createPageExportFilename,
  renderPageExportDocx,
} from "./page-word-export";
import { api } from "@baseblocks/backend";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function isExportFormat(value: string | null): value is "docx" {
  return value === "docx";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ pageId: string }> },
) {
  try {
    const { pageId } = await context.params;
    const requestedFormat = request.nextUrl.searchParams.get("format");

    if (!isExportFormat(requestedFormat)) {
      return NextResponse.json(
        { error: "Unsupported export format" },
        { status: 400 },
      );
    }

    const publicClient = getServerConvexClient();
    const sessionTokens = getRequestAccessSessionTokens(request);

    const page = await publicClient.query(api.pages.queries.get, {
      pageId: pageId as never,
      sessionTokens,
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const layouts = await publicClient.query(
      api.layouts.queries.listPublished,
      {
        pageId: pageId as never,
        sessionTokens,
      },
    );
    const pageTitle = page.title;

    const exportDocument = buildPageExportText({
      pageTitle,
      layouts,
    });

    const body = await renderPageExportDocx(exportDocument);
    const filename = createPageExportFilename({
      title: exportDocument.title,
      format: requestedFormat,
    });

    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(body.byteLength),
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
