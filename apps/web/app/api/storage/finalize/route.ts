import { getToken } from "@/lib/auth/server";
import { canUploadToSite } from "@/lib/convex/server";
import { headObject } from "@/lib/storage/server";
import type { UploadPurpose } from "@baseblocks/types";
import { type NextRequest, NextResponse } from "next/server";

function parsePurpose(value: unknown): UploadPurpose | null {
  if (value === "document" || value === "siteAsset") return value;
  return null;
}

function matchesUploadPrefix(
  siteId: string,
  purpose: UploadPurpose,
  objectKey: string,
) {
  const kind = purpose === "document" ? "documents" : "assets";
  return objectKey.startsWith(`sites/${siteId}/${kind}/`);
}

/**
 * POST /api/storage/finalize
 *
 * After the client completes a direct PUT to the bucket, it calls this route to
 * get server-verified metadata (size, contentType, etag).  The Convex mutation
 * should only be called with the values returned here, not with client-supplied
 * values.
 *
 * Body: { objectKey, siteId, purpose }
 * Returns: { bucket, objectKey, size, contentType, checksum }
 */
export async function POST(request: NextRequest) {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      objectKey,
      siteId,
      purpose: rawPurpose,
    } = body as Record<string, unknown>;

    if (
      typeof objectKey !== "string" ||
      typeof siteId !== "string" ||
      !objectKey ||
      !siteId
    ) {
      return NextResponse.json(
        { error: "Missing objectKey or siteId" },
        { status: 400 },
      );
    }

    const purpose = parsePurpose(rawPurpose);
    if (!purpose) {
      return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
    }

    const canUpload = await canUploadToSite(siteId, token);
    if (!canUpload) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (!matchesUploadPrefix(siteId, purpose, objectKey)) {
      return NextResponse.json(
        {
          error:
            "objectKey does not match expected prefix for this site and purpose",
        },
        { status: 400 },
      );
    }

    const meta = await headObject({ objectKey });
    if (!meta) {
      return NextResponse.json(
        {
          error: "Object not found in storage. Upload may not have completed.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      objectKey,
      size: meta.size,
      contentType: meta.contentType,
      checksum: meta.etag,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Finalize failed" },
      { status: 500 },
    );
  }
}
