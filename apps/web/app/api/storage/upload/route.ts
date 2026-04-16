import { getToken } from "@/lib/auth/server";
import { canUploadToSite } from "@/lib/convex/server";
import {
  createObjectKey,
  deleteObject,
  getStorageMaxUploadSize,
  signUpload,
  streamObject,
} from "@/lib/storage/server";
import {
  type UploadPurpose,
  isSupportedUploadMimeType,
  normalizeMimeType,
} from "@baseblocks/types";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function parsePurpose(value: unknown): UploadPurpose | null {
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

async function requireAuthorizedUploadSite(args: {
  siteId: string;
  purpose: UploadPurpose;
}): Promise<void> {
  const token = await getToken();
  if (!token) {
    throw new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
    });
  }

  const canUpload = await canUploadToSite(args.siteId, token);
  if (!canUpload) {
    throw new Response(JSON.stringify({ error: "Not authorized" }), {
      status: 403,
    });
  }
}

function getValidatedUploadMetadata(body: unknown): {
  siteId: string;
  purpose: UploadPurpose;
  filename: string;
  contentType: string;
  size: number;
} {
  const payload = body as Record<string, unknown>;
  const siteId =
    typeof payload.siteId === "string" ? payload.siteId.trim() : "";
  const purpose = parsePurpose(payload.purpose);
  const filename =
    typeof payload.filename === "string" ? payload.filename.trim() : "";
  const contentType =
    typeof payload.contentType === "string"
      ? payload.contentType
      : "application/octet-stream";
  const normalizedMimeType = normalizeMimeType(contentType);
  const size = typeof payload.size === "number" ? payload.size : Number.NaN;

  if (!siteId || !purpose) {
    throw new Response(JSON.stringify({ error: "Missing siteId or purpose" }), {
      status: 400,
    });
  }

  if (!filename) {
    throw new Response(JSON.stringify({ error: "Missing filename" }), {
      status: 400,
    });
  }

  if (!normalizedMimeType || !isSupportedUploadMimeType(normalizedMimeType)) {
    throw new Response(JSON.stringify({ error: "File type not allowed" }), {
      status: 415,
    });
  }

  if (!Number.isFinite(size) || size < 0) {
    throw new Response(JSON.stringify({ error: "Invalid file size" }), {
      status: 400,
    });
  }

  const maxUploadSize = getStorageMaxUploadSize();
  if (maxUploadSize !== null && size > maxUploadSize) {
    throw new Response(
      JSON.stringify({
        error: `File too large. Maximum size is ${maxUploadSize} bytes`,
      }),
      { status: 413 },
    );
  }

  return {
    siteId,
    purpose,
    filename,
    contentType: normalizedMimeType,
    size,
  };
}

function parseSizeHeader(rawValue: string | null): number | null {
  if (!rawValue) {
    return null;
  }

  const size = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(size) || size < 0) {
    throw new Response(JSON.stringify({ error: "Invalid file size" }), {
      status: 400,
    });
  }

  return size;
}

function getValidatedProxyUploadMetadata(request: NextRequest): {
  siteId: string;
  purpose: UploadPurpose;
  filename: string;
  contentType: string;
  size: number | null;
} {
  const siteId = request.headers.get("x-baseblocks-site-id")?.trim() || "";
  const purpose = parsePurpose(
    request.headers.get("x-baseblocks-upload-purpose")?.trim() || null,
  );
  const filename = request.headers.get("x-baseblocks-filename")?.trim() || "";
  const contentType =
    request.headers.get("content-type") || "application/octet-stream";
  const normalizedMimeType = normalizeMimeType(contentType);
  const size =
    parseSizeHeader(request.headers.get("x-baseblocks-upload-size")) ??
    parseSizeHeader(request.headers.get("content-length"));

  if (!siteId || !purpose) {
    throw new Response(JSON.stringify({ error: "Missing siteId or purpose" }), {
      status: 400,
    });
  }

  if (!filename) {
    throw new Response(JSON.stringify({ error: "Missing filename" }), {
      status: 400,
    });
  }

  if (!normalizedMimeType || !isSupportedUploadMimeType(normalizedMimeType)) {
    throw new Response(JSON.stringify({ error: "File type not allowed" }), {
      status: 415,
    });
  }

  if (size === 0) {
    throw new Response(JSON.stringify({ error: "Upload body is empty" }), {
      status: 400,
    });
  }

  const maxUploadSize = getStorageMaxUploadSize();
  if (maxUploadSize !== null && size !== null && size > maxUploadSize) {
    throw new Response(
      JSON.stringify({
        error: `File too large. Maximum size is ${maxUploadSize} bytes`,
      }),
      { status: 413 },
    );
  }

  return {
    siteId,
    purpose,
    filename,
    contentType: normalizedMimeType,
    size,
  };
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { siteId, purpose, filename, contentType } =
      getValidatedUploadMetadata(body);
    await requireAuthorizedUploadSite({ siteId, purpose });

    const objectKey = createObjectKey({ siteId, purpose, filename });
    const maxUploadSize = getStorageMaxUploadSize() ?? undefined;
    const upload = await signUpload({
      objectKey,
      contentType,
      maxUploadSizeBytes: maxUploadSize,
    });

    return NextResponse.json({
      objectKey,
      contentType,
      uploadUrl: upload.url,
      uploadMethod: upload.method,
      uploadFields: upload.fields,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to authorize upload",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!request.body) {
      return NextResponse.json(
        { error: "Upload body is empty" },
        { status: 400 },
      );
    }

    const { siteId, purpose, filename, contentType, size } =
      getValidatedProxyUploadMetadata(request);
    await requireAuthorizedUploadSite({ siteId, purpose });

    const objectKey = createObjectKey({ siteId, purpose, filename });
    await streamObject({
      objectKey,
      contentType,
      body: request.body,
      contentLength: size ?? undefined,
    });

    return NextResponse.json({
      objectKey,
      contentType,
      size,
    });
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
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const siteId = request.headers.get("x-baseblocks-site-id")?.trim() || "";
    const purpose = parsePurpose(
      request.headers.get("x-baseblocks-upload-purpose")?.trim() || null,
    );
    const objectKey = request.headers.get("x-baseblocks-object-key")?.trim();

    if (!siteId || !purpose || !objectKey) {
      return NextResponse.json(
        { error: "Missing cleanup authorization headers" },
        { status: 400 },
      );
    }

    const canUpload = await canUploadToSite(siteId, token);
    if (!canUpload) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cleanup failed" },
      { status: 500 },
    );
  }
}
