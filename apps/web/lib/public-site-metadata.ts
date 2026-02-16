import "server-only";

import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { ConvexHttpClient } from "convex/browser";
import type { Metadata } from "next";
import { headers } from "next/headers";

interface PublicSiteMetadataParams {
  companySlug: string;
  siteSlug?: string;
  pagePath?: string[];
}

interface PublicSiteSettings {
  favicon?: string;
  ogImage?: string;
  siteTitle?: string;
  siteDescription?: string;
  siteKeywords?: string;
}

interface PublicSiteDoc {
  _id: Id<"sites">;
  name: string;
  updatedAt?: number;
  settings?: PublicSiteSettings;
}

interface PublicPageDoc {
  title?: string;
}

interface PublicSiteWithDefaultPageDoc {
  site: PublicSiteDoc;
  defaultPage?: PublicPageDoc | null;
}

function asOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseKeywords(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function toPublicAssetUrl(rawUrl: string | undefined): string | undefined {
  const trimmed = asOptional(rawUrl);
  if (!trimmed) return undefined;

  if (trimmed.startsWith("/api/storage/download")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const path = parsed.searchParams.get("path");
    if (path) {
      return `/api/storage/download?path=${encodeURIComponent(path)}`;
    }
  } catch {
    // Keep non-URL strings as-is (they might already be root-relative paths).
  }

  return trimmed;
}

function withVersion(url: string | undefined, version: number | undefined): string | undefined {
  if (!url || !version) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${version}`;
}

async function resolveMetadataBase(companySlug: string): Promise<URL> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";

  if (host) {
    return new URL(`${protocol}://${host}`);
  }

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "baseblocks.dev";
  return new URL(`https://${companySlug}.${rootDomain}`);
}

function getConvexClient(): ConvexHttpClient | null {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return null;
  return new ConvexHttpClient(convexUrl);
}

export async function buildPublicSiteMetadata({
  companySlug,
  siteSlug,
  pagePath = [],
}: PublicSiteMetadataParams): Promise<Metadata> {
  const client = getConvexClient();
  if (!client) return {};

  let site: PublicSiteDoc | null = null;
  let pageTitle: string | undefined;

  try {
    if (siteSlug) {
      site = (await client.query(api.sites.queries.getBySlug, {
        companySlug,
        siteSlug,
      })) as PublicSiteDoc | null;

      if (site) {
        const page = (await client.query(api.pages.queries.getByPathPublished, {
          siteId: site._id,
          path: pagePath,
        })) as PublicPageDoc | null;
        pageTitle = page?.title;
      }
    } else {
      const siteData = (await client.query(api.sites.queries.getWithDefaultPage, {
        companySlug,
      })) as PublicSiteWithDefaultPageDoc | null;
      site = siteData?.site ?? null;
      pageTitle = siteData?.defaultPage?.title;
    }
  } catch (error) {
    console.error("Failed to build public site metadata:", error);
    return {};
  }

  if (!site) return {};

  const settings = (site.settings ?? {}) as PublicSiteSettings;
  const siteTitle = asOptional(settings.siteTitle) ?? site.name;
  const title =
    pageTitle && pageTitle !== siteTitle ? `${pageTitle} | ${siteTitle}` : siteTitle;
  const description = asOptional(settings.siteDescription);
  const keywords = parseKeywords(settings.siteKeywords);
  const version = site.updatedAt;
  const ogImage = withVersion(toPublicAssetUrl(settings.ogImage), version);
  const favicon = withVersion(toPublicAssetUrl(settings.favicon), version);

  return {
    metadataBase: await resolveMetadataBase(companySlug),
    title,
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
    icons: favicon
      ? {
          icon: [{ url: favicon }],
          shortcut: [{ url: favicon }],
          apple: [{ url: favicon }],
        }
      : undefined,
    openGraph: {
      type: "website",
      title,
      description,
      siteName: siteTitle,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}
