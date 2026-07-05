import { getToken } from "@/lib/auth/server";
import { getAuthorizedAsset, getServerConvexClient } from "@/lib/convex/server";
import { getFileUrl } from "@/lib/files/server";
import { getRequestAccessSessionTokens } from "@/lib/public-site/access-session";
import { api } from "@baseblocks/backend";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ assetId: string }> },
) {
  try {
    const { assetId } = await context.params;
    const token = await getToken();
    const sessionTokens = getRequestAccessSessionTokens(request);
    const authorizedAsset = token
      ? await getAuthorizedAsset(assetId, token).catch(() => null)
      : null;

    const asset =
      authorizedAsset ||
      (await getServerConvexClient().query(api.assets.queries.getPublicAsset, {
        assetId: assetId as never,
        sessionTokens,
      }));

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const download = request.nextUrl.searchParams.get("download") === "1";
    const signedUrl = await getFileUrl({
      key: asset.objectKey,
      expiresIn: 60 * 60,
    });

    // Proxy server-side to avoid CORS/Referer blocks when the browser fetches
    // assets from a custom subdomain (e.g. filassistance.baseblocks.dev).
    const isImage = asset.contentType.startsWith("image/");
    const upstream = await fetch(signedUrl);
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Failed to fetch asset from storage" },
        { status: upstream.status },
      );
    }

    const headers = new Headers({
      "Content-Type": asset.contentType,
      "Cache-Control": isImage
        ? "public, max-age=300, stale-while-revalidate=3600"
        : "private, no-store",
    });
    const contentLength = upstream.headers.get("Content-Length");
    if (contentLength) headers.set("Content-Length", contentLength);
    if (download && asset.filename) {
      headers.set(
        "Content-Disposition",
        `attachment; filename="${asset.filename}"`,
      );
    }

    return new NextResponse(upstream.body, { headers });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to serve asset",
      },
      { status: 500 },
    );
  }
}
