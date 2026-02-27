import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { extractTeamSlug } from "@/lib/domains";
/**
 * Dynamic favicon handler for multi-tenant subdomains.
 *
 * Browsers always request /favicon.ico directly (regardless of <link> tags).
 * This route reads the Host header to determine the tenant, fetches their
 * custom favicon from Convex storage if one is configured, and falls back
 * to the default BaseBlocks favicon otherwise.
 */
import { api } from "@baseblocks/backend";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ENTITY_STORAGE_SITE_URL = process.env.NEXT_PUBLIC_ENTITY_STORAGE_SITE_URL;

let defaultFaviconCache: ArrayBuffer | null = null;

function extractStoragePath(faviconUrl: string): string | undefined {
  if (faviconUrl.startsWith("/api/storage/download")) {
    try {
      const url = new URL(faviconUrl, "http://localhost");
      return url.searchParams.get("path") || undefined;
    } catch {
      return undefined;
    }
  }

  try {
    const parsed = new URL(faviconUrl);
    return parsed.searchParams.get("path") || undefined;
  } catch {
    return undefined;
  }
}

async function getDefaultFavicon(): Promise<NextResponse> {
  if (!defaultFaviconCache) {
    const buf = await readFile(
      join(process.cwd(), "public", "baseblocks-favicon.ico"),
    );
    defaultFaviconCache = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    );
  }
  return new NextResponse(defaultFaviconCache, {
    headers: {
      "Content-Type": "image/x-icon",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

export async function GET(request: Request) {
  const host = request.headers.get("host") || "";
  const teamSlug = extractTeamSlug(host);

  // custom: prefix means custom domain — no favicon lookup for those yet
  if (!teamSlug || teamSlug.startsWith("custom:")) {
    return getDefaultFavicon();
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return getDefaultFavicon();
  }

  try {
    const client = new ConvexHttpClient(convexUrl);
    const site = await client.query(api.sites.queries.getBySlug, {
      teamSlug,
    });

    const favicon = (site?.settings as Record<string, unknown> | undefined)
      ?.favicon as string | undefined;
    if (!favicon) {
      return getDefaultFavicon();
    }

    const storagePath = extractStoragePath(favicon);
    if (!storagePath) {
      return getDefaultFavicon();
    }

    const response = await fetch(
      `${ENTITY_STORAGE_SITE_URL}/fs/download?path=${encodeURIComponent(storagePath)}`,
    );

    if (!response.ok) {
      return getDefaultFavicon();
    }

    const data = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/x-icon";

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (_error) {
    return getDefaultFavicon();
  }
}
