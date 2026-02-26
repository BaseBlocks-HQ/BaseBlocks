import { getToken } from "@/lib/auth/server";
/**
 * Proxy endpoint for file uploads to Entity Storage
 * Authenticates via Better Auth session cookie, then forwards JWT to Entity Storage
 */
import { type NextRequest, NextResponse } from "next/server";

const ENTITY_STORAGE_SITE_URL = process.env.NEXT_PUBLIC_ENTITY_STORAGE_SITE_URL;

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
]);

export async function POST(request: NextRequest) {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const contentType =
      request.headers.get("content-type") || "application/octet-stream";

    const mimeType = contentType.split(";")[0]?.trim() ?? "";
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 415 },
      );
    }

    const contentLength = request.headers.get("content-length");
    if (contentLength && Number.parseInt(contentLength, 10) > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50 MB" },
        { status: 413 },
      );
    }

    const body = await request.arrayBuffer();

    if (body.byteLength > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50 MB" },
        { status: 413 },
      );
    }

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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
