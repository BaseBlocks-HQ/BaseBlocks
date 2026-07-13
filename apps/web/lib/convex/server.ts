import "server-only";

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
