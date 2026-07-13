import { getToken } from "@/lib/auth/server";
import { getServerConvexClient } from "@/lib/convex/server";
import { deleteObject, signedDownloadUrl } from "@/lib/files/server";
import { api } from "@baseblocks/backend";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type FileAsset = {
  objectKey: string;
  contentType: string;
  filename?: string;
};

async function resolveFile(fileId: string): Promise<FileAsset | null> {
  const token = await getToken();
  const authorized = token
    ? await getServerConvexClient(token)
        .query(api.files.getAuthorized, { fileId: fileId as never })
        .catch(() => null)
    : null;
  return (
    authorized ??
    (await getServerConvexClient().query(api.files.getPublic, {
      fileId: fileId as never,
    }))
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const { fileId } = await params;
    const file = await resolveFile(fileId);
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const download = request.nextUrl.searchParams.get("download") === "1";
    const signedUrl = await signedDownloadUrl(file.objectKey, {
      expiresIn: 60 * 60,
      download,
    });
    const upstream = await fetch(signedUrl);
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Failed to fetch file from storage" },
        { status: upstream.status },
      );
    }

    const headers = new Headers({
      "Cache-Control": file.contentType.startsWith("image/")
        ? "public, max-age=300, stale-while-revalidate=3600"
        : "private, no-store",
      "Content-Type": file.contentType || "application/octet-stream",
    });
    const contentLength = upstream.headers.get("Content-Length");
    if (contentLength) headers.set("Content-Length", contentLength);
    if (download && file.filename) {
      headers.set(
        "Content-Disposition",
        `attachment; filename="${file.filename.replaceAll('"', "")}"`,
      );
    }
    return new NextResponse(upstream.body, { headers });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to serve file",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { fileId } = await params;
    const client = getServerConvexClient(token);
    const file = await client.query(api.files.getDownloadAsset, {
      fileId: fileId as never,
    });
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    if (file.kind === "siteAsset") {
      return NextResponse.json(
        { error: "Asset deletion must follow its owning product workflow" },
        { status: 405 },
      );
    }
    await deleteObject(file.objectKey);
    await client.mutation(api.files.remove, {
      fileId: fileId as never,
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 502 },
    );
  }
}
