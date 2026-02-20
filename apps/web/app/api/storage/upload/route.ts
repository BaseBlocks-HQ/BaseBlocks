import { getToken } from "@/lib/auth/server";
/**
 * Proxy endpoint for file uploads to Entity Storage
 * Authenticates via Better Auth session cookie, then forwards JWT to Entity Storage
 */
import { type NextRequest, NextResponse } from "next/server";

const ENTITY_STORAGE_SITE_URL = process.env.NEXT_PUBLIC_ENTITY_STORAGE_SITE_URL;

export async function POST(request: NextRequest) {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const contentType =
      request.headers.get("content-type") || "application/octet-stream";
    const body = await request.arrayBuffer();

    const response = await fetch(`${ENTITY_STORAGE_SITE_URL}/fs/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
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
