/**
 * Proxy endpoint for file downloads from Entity Storage
 * This bypasses CORS issues by making the request server-side
 */
import { type NextRequest, NextResponse } from "next/server";

const ENTITY_STORAGE_SITE_URL = process.env.NEXT_PUBLIC_ENTITY_STORAGE_SITE_URL;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { error: "Missing path parameter" },
        { status: 400 },
      );
    }

    // Forward the request to Entity Storage
    const response = await fetch(
      `${ENTITY_STORAGE_SITE_URL}/fs/download?path=${encodeURIComponent(path)}`,
      {
        method: "GET",
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Download failed: ${response.status}` },
        { status: response.status },
      );
    }

    // Get the file data and headers
    const data = await response.arrayBuffer();
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const contentDisposition = response.headers.get("content-disposition");

    // Return the file with proper headers
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Length", data.byteLength.toString());
    headers.set("X-Content-Type-Options", "nosniff");

    // Force download for non-safe content types to prevent XSS via served HTML/SVG
    const safeContentTypes = [
      "image/",
      "application/pdf",
      "text/plain",
      "application/json",
    ];
    const isSafeType = safeContentTypes.some((t) => contentType.startsWith(t));

    if (contentDisposition) {
      headers.set("Content-Disposition", contentDisposition);
    } else if (!isSafeType) {
      headers.set("Content-Disposition", "attachment");
    }

    // Cache images (favicons, OG images) for 1 hour, revalidate in background.
    // The `v=` query param from metadata busts stale entries on update.
    if (contentType.startsWith("image/")) {
      headers.set(
        "Cache-Control",
        "public, max-age=3600, stale-while-revalidate=86400",
      );
    }

    return new NextResponse(data, {
      status: 200,
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download failed" },
      { status: 500 },
    );
  }
}
