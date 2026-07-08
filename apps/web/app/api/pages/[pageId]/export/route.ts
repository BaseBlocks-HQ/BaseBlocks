import { getToken } from "@/lib/auth/server";
import { getServerConvexClient } from "@/lib/convex/server";
import { getRequestAccessSessionTokens } from "@/lib/public-site/access-session";
import {
  buildPageExportDocument,
  createPageExportFilename,
  renderPageExportDocx,
} from "@/modules/page-export/page-export";
import { api } from "@baseblocks/backend";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function isExportMode(value: string | null): value is "draft" | "published" {
  return value === "draft" || value === "published";
}

function isExportFormat(value: string | null): value is "docx" {
  return value === "docx";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ pageId: string }> },
) {
  try {
    const { pageId } = await context.params;
    const requestedMode = request.nextUrl.searchParams.get("mode");
    const requestedFormat = request.nextUrl.searchParams.get("format");

    if (!isExportMode(requestedMode)) {
      return NextResponse.json(
        { error: "Unsupported export mode" },
        { status: 400 },
      );
    }

    if (!isExportFormat(requestedFormat)) {
      return NextResponse.json(
        { error: "Unsupported export format" },
        { status: 400 },
      );
    }

    const token = await getToken();
    const authedClient = getServerConvexClient(token);
    const publicClient = getServerConvexClient();
    const sessionTokens = getRequestAccessSessionTokens(request);

    const isDraft = requestedMode === "draft";
    if (isDraft && !token) {
      return NextResponse.json(
        { error: "Authentication required for draft exports" },
        { status: 401 },
      );
    }

    const page = isDraft
      ? await authedClient.query(api.pages.queries.get, {
          pageId: pageId as never,
        })
      : await publicClient.query(api.pages.queries.get, {
          pageId: pageId as never,
          sessionTokens,
        });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const layouts = isDraft
      ? await authedClient.query(api.layouts.queries.list, {
          pageId: pageId as never,
        })
      : await publicClient.query(api.layouts.queries.listPublished, {
          pageId: pageId as never,
          sessionTokens,
        });

    const pageTitle =
      requestedMode === "published"
        ? (page.publishedTitle ?? page.title)
        : page.title;

    const exportDocument = buildPageExportDocument({
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
