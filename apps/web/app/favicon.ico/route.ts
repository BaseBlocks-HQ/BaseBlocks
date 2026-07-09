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

export const dynamic = "force-dynamic";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "baseblocks.dev";

function extractTeamSlug(host: string): string | null {
  const hostname = host.split(":")[0] || "";

  if (hostname.includes(".localhost")) {
    return hostname.split(".")[0] || null;
  }

  if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
    return null;
  }

  const rootDomain = ROOT_DOMAIN.split(":")[0] || ROOT_DOMAIN;

  if (
    hostname !== rootDomain &&
    hostname !== `www.${rootDomain}` &&
    hostname.endsWith(`.${rootDomain}`)
  ) {
    return hostname.replace(`.${rootDomain}`, "");
  }

  if (hostname !== rootDomain && hostname !== `www.${rootDomain}`) {
    return `custom:${hostname}`;
  }

  return null;
}

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
    const site = await client.query(api.sites.getBySlug, {
      teamSlug,
    });

    const visibility = site?.visibility ?? "public";
    if (visibility === "private" || visibility === "password") {
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
