import { getToken } from "@/lib/auth/server";
import { canUploadToSite } from "@/lib/convex/server";
import {
  createObjectKey,
  deleteObject,
  streamObject,
} from "@/lib/storage/server";
import {
  type UploadPurpose,
  isSupportedUploadMimeType,
  normalizeMimeType,
} from "@baseblocks/types";
import { type NextRequest, NextResponse } from "next/server";

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

export const runtime = "nodejs";

function parsePurpose(value: string | null): UploadPurpose | null {
  if (value === "document" || value === "siteAsset") {
    return value;
  }
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

async function requireAuthorizedSiteId(request: NextRequest): Promise<{
  siteId: string;
  purpose: UploadPurpose;
}> {
  const token = await getToken();
  if (!token) {
    throw new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
    });
  }

  const siteId = request.headers.get("x-baseblocks-site-id")?.trim();
  const purpose = parsePurpose(
    request.headers.get("x-baseblocks-upload-purpose")?.trim() || null,
  );

  if (!siteId || !purpose) {
    throw new Response(
      JSON.stringify({ error: "Missing upload authorization headers" }),
      {
        status: 400,
      },
    );
  }

  const canUpload = await canUploadToSite(siteId, token);
  if (!canUpload) {
    throw new Response(JSON.stringify({ error: "Not authorized" }), {
      status: 403,
    });
  }

  return { siteId, purpose };
}

function getValidatedUploadMetadata(request: NextRequest): {
  filename: string;
  contentType: string;
  size: number | null;
} {
  const filename = request.headers.get("x-baseblocks-filename")?.trim();
  if (!filename) {
    throw new Response(
      JSON.stringify({ error: "Missing x-baseblocks-filename header" }),
      {
        status: 400,
      },
    );
  }

  const contentType =
    request.headers.get("content-type") || "application/octet-stream";
  const normalizedMimeType = normalizeMimeType(contentType);
  if (!normalizedMimeType || !isSupportedUploadMimeType(normalizedMimeType)) {
    throw new Response(JSON.stringify({ error: "File type not allowed" }), {
      status: 415,
    });
  }

  const contentLength = request.headers.get("content-length");
  const size = contentLength ? Number.parseInt(contentLength, 10) : null;
  if (size !== null && Number.isNaN(size)) {
    throw new Response(
      JSON.stringify({ error: "Invalid content-length header" }),
      {
        status: 400,
      },
    );
  }

  if (size !== null && size > MAX_UPLOAD_SIZE) {
    throw new Response(
      JSON.stringify({ error: "File too large. Maximum size is 50 MB" }),
      {
        status: 413,
      },
    );
  }

  return {
    filename,
    contentType: normalizedMimeType,
    size,
  };
}

export async function PUT(request: NextRequest) {
  try {
    const { siteId, purpose } = await requireAuthorizedSiteId(request);
    const { filename, contentType, size } = getValidatedUploadMetadata(request);

    if (!request.body) {
      return NextResponse.json(
        { error: "Upload body is empty" },
        { status: 400 },
      );
    }

    const objectKey = createObjectKey({ siteId, purpose, filename });

    // Stream directly to storage — avoids loading the full file into memory.
    // Content-length is forwarded so the SDK can set it on the S3 request;
    // the finalize endpoint does a HeadObject for the authoritative size.
    await streamObject({
      objectKey,
      contentType,
      body: request.body,
      contentLength: size ?? undefined,
    });

    return NextResponse.json({ objectKey, contentType });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { siteId, purpose } = await requireAuthorizedSiteId(request);
    const objectKey = request.headers.get("x-baseblocks-object-key")?.trim();
    if (!objectKey) {
      return NextResponse.json(
        { error: "Missing x-baseblocks-object-key header" },
        { status: 400 },
      );
    }

    if (!matchesUploadPrefix(siteId, purpose, objectKey)) {
      return NextResponse.json(
        { error: "Invalid object key" },
        { status: 400 },
      );
    }

    await deleteObject({ objectKey });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cleanup failed" },
      { status: 500 },
    );
  }
}
