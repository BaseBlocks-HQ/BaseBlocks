import { getToken } from "@/app/_auth/server";
import { getServerConvexClient } from "@/app/_convex/server";
import { deleteObject, signedDownloadUrl } from "@/lib/files/server";
import { getRequestAccessSessionTokens } from "@/modules/public-site/access-session";
import { api } from "@baseblocks/backend";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await context.params;
    const token = await getToken();
    const authedClient = getServerConvexClient(token);
    const sessionTokens = getRequestAccessSessionTokens(request);

    let document = token
      ? await authedClient
          .query(api.documents.getDownloadAsset, {
            documentId: documentId as never,
          })
          .catch(() => null)
      : null;

    if (!document) {
      document = await getServerConvexClient().query(
        api.documents.getPublicDownloadAsset,
        {
          documentId: documentId as never,
          sessionTokens,
        },
      );
    }

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const download = request.nextUrl.searchParams.get("download") === "1";
    const signedUrl = await signedDownloadUrl(document.objectKey, {
      expiresIn: 60 * 60,
      download,
    });

    // Proxy the content server-side to avoid CORS issues when the browser
    // fetches documents (e.g. PDF viewer) from a different origin (Tigris).
    const upstream = await fetch(signedUrl);
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Failed to fetch document from storage" },
        { status: upstream.status },
      );
    }

    const headers = new Headers({
      "Cache-Control": "private, no-store",
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/octet-stream",
    });
    const contentLength = upstream.headers.get("Content-Length");
    if (contentLength) headers.set("Content-Length", contentLength);
    if (download && document.filename) {
      headers.set(
        "Content-Disposition",
        `attachment; filename="${document.filename}"`,
      );
    }

    return new NextResponse(upstream.body, { headers });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to serve document",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ documentId: string }> },
) {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { documentId } = await context.params;
    const client = getServerConvexClient(token);
    const document = await client.query(api.documents.getDownloadAsset, {
      documentId: documentId as never,
    });
    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Object-first semantics: if storage fails, metadata remains and the
    // operation can be retried without creating an unreachable orphan.
    await deleteObject(document.objectKey);
    await client.mutation(api.documents.remove, {
      documentId: documentId as never,
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 502 },
    );
  }
}
