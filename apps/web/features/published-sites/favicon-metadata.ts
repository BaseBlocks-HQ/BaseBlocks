import "server-only";

import type { Metadata } from "next";
import {
  isAccessiblePublishedPageMetadata,
  type PublishedPageMetadataResolution,
} from "./read-model";

function truncateDescription(value: string, maxLength = 160) {
  if (value.length <= maxLength) return value;
  const shortened = value.slice(0, maxLength - 1);
  const lastSpace = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, lastSpace > 100 ? lastSpace : undefined).trim()}…`;
}

export function buildPublicSiteMetadata(
  result: PublishedPageMetadataResolution | null,
  canonicalUrl: string | null,
): Metadata {
  if (
    !result ||
    !isAccessiblePublishedPageMetadata(result) ||
    result.access.visibility !== "public"
  ) {
    return { robots: { index: false, follow: false } };
  }

  const title = `${result.title} | ${result.site.name}`;
  const description = truncateDescription(
    result.descriptionText || `${result.title} on ${result.site.name}`,
  );
  const favicon = result.site.faviconUrl;

  return {
    title: { absolute: title },
    description,
    alternates: canonicalUrl ? { canonical: canonicalUrl } : undefined,
    icons: favicon ? { icon: favicon, apple: favicon } : undefined,
    openGraph: {
      type: "website",
      title,
      description,
      siteName: result.site.name,
      url: canonicalUrl ?? undefined,
    },
    twitter: { card: "summary", title, description },
    robots: { index: true, follow: true },
  };
}
