import { api } from "@baseblocks/backend";
import { ConvexHttpClient } from "convex/browser";

function getConvexUrl(): string {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  }
  return convexUrl;
}

export function getServerConvexClient(token?: string | null): ConvexHttpClient {
  const client = new ConvexHttpClient(getConvexUrl());
  if (token) {
    client.setAuth(token);
  }
  return client;
}

export async function canUploadToSite(
  siteId: string,
  token: string,
): Promise<boolean> {
  const client = getServerConvexClient(token);
  return await client.query(api.assets.queries.canUploadToSite, {
    siteId: siteId as never,
  });
}

export async function getAuthorizedAsset(assetId: string, token: string) {
  const client = getServerConvexClient(token);
  return await client.query(api.assets.queries.getAuthorizedAsset, {
    assetId: assetId as never,
  });
}
