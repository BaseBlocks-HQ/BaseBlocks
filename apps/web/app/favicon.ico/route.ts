import { readFile } from "node:fs/promises";
import { join } from "node:path";
/**
 * Dynamic favicon handler for multi-tenant subdomains.
 *
 * Browsers always request /favicon.ico directly (regardless of <link> tags).
 * This route reads the Host header to determine the tenant, fetches their
 * custom favicon from the configured Files SDK storage route, and falls back
 * to the default BaseBlocks favicon otherwise.
 */
import { api } from "@baseblocks/backend";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { parseRequestHost } from "@/lib/routing/hosts";

export const dynamic = "force-dynamic";

let defaultFaviconCache: ArrayBuffer | null = null;

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
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  const parsedHost = parseRequestHost(host);
  if (
    parsedHost.kind === "root" ||
    parsedHost.kind === "www" ||
    parsedHost.kind === "localhost" ||
    parsedHost.kind === "vercel-deployment"
  ) {
    return getDefaultFavicon();
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return getDefaultFavicon();
  }

  try {
    const client = new ConvexHttpClient(convexUrl);
    const mapping =
      parsedHost.kind === "custom-domain"
        ? await client.query(api.siteDomains.resolve, {
            hostname: parsedHost.hostname,
          })
        : null;
    const teamSlug =
      mapping?.organizationSlug ??
      ("organizationSlug" in parsedHost ? parsedHost.organizationSlug : null);
    if (!teamSlug) return getDefaultFavicon();
    const result = await client.query(api.published.resolve, {
      organizationSlug: teamSlug,
      siteSlug: mapping?.siteSlug,
      pagePath: [],
    });
    const site = result?.site;

    const visibility = site?.visibility ?? "public";
    if (visibility === "private") {
      return getDefaultFavicon();
    }

    const favicon = (site?.settings as Record<string, unknown> | undefined)
      ?.favicon as string | undefined;
    if (!favicon) {
      return getDefaultFavicon();
    }

    const targetUrl = favicon.startsWith("/")
      ? new URL(favicon, `${protocol}://${host}`).toString()
      : favicon;
    const response = await fetch(targetUrl);

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
