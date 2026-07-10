import "server-only";

import type { Metadata } from "next";
import type { PublishedPageResult } from "./read-model";
import { getCanonicalUrl } from "./urls";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "baseblocks.dev";

const clean = (value?: string) => value?.trim() || undefined;

export function buildPublicSiteMetadata(
  result: PublishedPageResult | null,
  customDomain?: string,
): Metadata {
  if (!result) return { robots: { index: false, follow: false } };
  const settings = result.site.settings;
  const siteTitle = clean(settings.siteTitle) ?? result.site.name;
  const title =
    result.page?.title && result.page.title !== siteTitle
      ? `${result.page.title} | ${siteTitle}`
      : siteTitle;
  const description = clean(settings.siteDescription);
  const canonical = getCanonicalUrl({
    ...result.canonicalUrlInputs,
    customDomain,
  });
  const indexable =
    result.access.visibility === "public" &&
    result.access.status === "accessible";
  const image =
    clean(settings.ogImage) ?? `https://${ROOT_DOMAIN}/opengraph-image`;
  const keywords = clean(settings.siteKeywords)
    ?.split(",")
    .map((item: string) => item.trim())
    .filter(Boolean);
  return {
    title,
    description,
    keywords,
    alternates: indexable ? { canonical } : undefined,
    robots: indexable ? undefined : { index: false, follow: false },
    openGraph: {
      type: "website",
      title,
      description,
      siteName: siteTitle,
      url: canonical,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    icons: settings.favicon
      ? { icon: settings.favicon, apple: settings.favicon }
      : undefined,
  };
}
