/**
 * Proxy endpoint for file uploads to Entity Storage
 * This bypasses CORS issues by making the request server-side
 */
import { type NextRequest, NextResponse } from "next/server";

const ENTITY_STORAGE_SITE_URL =
  process.env.NEXT_PUBLIC_ENTITY_STORAGE_SITE_URL ||
  "https://rightful-cat-553.convex.site";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 },
      );
    }

    const contentType =
      request.headers.get("content-type") || "application/octet-stream";
    const body = await request.arrayBuffer();

    // Forward the request to Entity Storage
    const response = await fetch(`${ENTITY_STORAGE_SITE_URL}/fs/upload`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": contentType,
        "Content-Length": body.byteLength.toString(),
      },
      body: body,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || `Upload failed: ${response.status}` },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Storage upload proxy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
