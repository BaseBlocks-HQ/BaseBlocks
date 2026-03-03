import "server-only";

import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { ConvexHttpClient } from "convex/browser";
import type { Metadata } from "next";
import { headers } from "next/headers";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "baseblocks.dev";

interface PublicSiteMetadataParams {
  teamSlug: string;
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

type SiteVisibility = "private" | "public" | "link-only" | "password";

interface PublicSiteDoc {
  _id: Id<"sites">;
  name: string;
  slug: string;
  visibility?: SiteVisibility;
  updatedAt?: number;
  settings?: PublicSiteSettings;
}

interface PublicPageDoc {
  title?: string;
}

interface PublicSiteWithDefaultPageDoc {
  site: PublicSiteDoc;
  team?: { slug: string };
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

function withVersion(
  url: string | undefined,
  version: number | undefined,
): string | undefined {
  if (!url || !version) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${version}`;
}

async function resolveMetadataBase(teamSlug: string): Promise<URL> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";

  if (host) {
    return new URL(`${protocol}://${host}`);
  }

  return new URL(`https://${teamSlug}.${ROOT_DOMAIN}`);
}

function getConvexClient(): ConvexHttpClient | null {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return null;
  return new ConvexHttpClient(convexUrl);
}

/**
 * Build the canonical URL for a public site page.
 */
function buildCanonicalUrl(
  teamSlug: string,
  siteSlug?: string,
  pagePath: string[] = [],
): string {
  const base = `https://${teamSlug}.${ROOT_DOMAIN}`;
  if (!siteSlug) return base;
  const pathSuffix =
    pagePath.length > 0 ? `/${siteSlug}/${pagePath.join("/")}` : `/${siteSlug}`;
  return `${base}${pathSuffix}`;
}

export async function buildPublicSiteMetadata({
  teamSlug,
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
        teamSlug,
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
      const siteData = (await client.query(
        api.sites.queries.getWithDefaultPage,
        {
          teamSlug,
        },
      )) as PublicSiteWithDefaultPageDoc | null;
      site = siteData?.site ?? null;
      pageTitle = siteData?.defaultPage?.title;
    }
  } catch (_error) {
    return {};
  }

  if (!site) return {};

  const settings = (site.settings ?? {}) as PublicSiteSettings;
  const siteTitle = asOptional(settings.siteTitle) ?? site.name;
  const title =
    pageTitle && pageTitle !== siteTitle
      ? `${pageTitle} | ${siteTitle}`
      : siteTitle;
  const description = asOptional(settings.siteDescription);
  const keywords = parseKeywords(settings.siteKeywords);
  const version = site.updatedAt;
  const ogImage = withVersion(toPublicAssetUrl(settings.ogImage), version);
  const favicon = withVersion(toPublicAssetUrl(settings.favicon), version);
  const canonicalUrl = buildCanonicalUrl(teamSlug, siteSlug, pagePath);
  const isPublicVisibility = !site.visibility || site.visibility === "public";

  const metadata: Metadata = {
    metadataBase: await resolveMetadataBase(teamSlug),
    title,
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
    // Non-public sites: tell search engines not to index or follow links
    robots: isPublicVisibility ? undefined : { index: false, follow: false },
    // Only set canonical/alternates for publicly visible sites
    alternates: isPublicVisibility
      ? {
          canonical: canonicalUrl,
          languages: {
            en: canonicalUrl,
            fr: canonicalUrl.replace(
              `://${teamSlug}.${ROOT_DOMAIN}`,
              `://${teamSlug}.${ROOT_DOMAIN}/fr`,
            ),
          },
        }
      : undefined,
    openGraph: {
      type: "website",
      title,
      description,
      siteName: siteTitle,
      url: canonicalUrl,
      locale: "en_US",
      alternateLocale: "fr_FR",
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };

  // Only set icons when a tenant favicon exists — omitting the key entirely
  // lets Next.js inherit the parent layout's default BaseBlocks favicon.
  if (favicon) {
    metadata.icons = {
      icon: [{ url: favicon }],
      shortcut: [{ url: favicon }],
      apple: [{ url: favicon }],
    };
  }

  return metadata;
}
