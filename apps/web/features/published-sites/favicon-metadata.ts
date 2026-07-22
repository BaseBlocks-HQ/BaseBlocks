import "server-only";

import { extractOpenEditorText } from "@baseblocks/backend";
import type { Metadata } from "next";
import type { PublishedPageResult } from "./read-model";

function truncateDescription(value: string, maxLength = 160) {
  if (value.length <= maxLength) return value;
  const shortened = value.slice(0, maxLength - 1);
  const lastSpace = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, lastSpace > 100 ? lastSpace : undefined).trim()}…`;
}

export function buildPublicSiteMetadata(
  result: PublishedPageResult | null,
  canonicalUrl: string | null,
): Metadata {
  const isIndexable =
    result?.access.visibility === "public" &&
    result.access.status === "accessible" &&
    result.page !== null;

  if (!result || !isIndexable || !result.page) {
    return { robots: { index: false, follow: false } };
  }

  const title = `${result.page.title} | ${result.site.name}`;
  const pageText = extractOpenEditorText(result.content);
  const description = truncateDescription(
    pageText || `${result.page.title} on ${result.site.name}`,
  );
  const favicon = result?.site.settings.favicon;

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
