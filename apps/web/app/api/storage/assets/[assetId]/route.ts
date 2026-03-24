import { getToken } from "@/lib/auth/server";
import { getAuthorizedAsset, getServerConvexClient } from "@/lib/convex/server";
import { getRequestAccessSessionTokens } from "@/lib/public-site/access-session";
import { createSignedDownloadUrl } from "@/lib/storage/server";
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
    const signedUrl = await createSignedDownloadUrl({
      bucket: asset.bucket,
      objectKey: asset.objectKey,
      filename: asset.filename,
      download,
      expiresInSeconds: 60 * 60,
    });

    return NextResponse.redirect(signedUrl, {
      headers: asset.contentType.startsWith("image/")
        ? {
            "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
          }
        : {
            "Cache-Control": "private, no-store",
          },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to serve asset",
      },
      { status: 500 },
    );
  }
}
