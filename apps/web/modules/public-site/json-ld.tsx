import "server-only";

import type { BreadcrumbList, WebSite, WithContext } from "schema-dts";
import { getCanonicalUrl } from "./urls";

/**
 * Build WebSite JSON-LD for a public site.
 */
export function buildWebSiteJsonLd({
  siteTitle,
  siteDescription,
  teamSlug,
  siteSlug,
  customDomain,
}: {
  siteTitle: string;
  siteDescription?: string;
  teamSlug: string;
  siteSlug?: string;
  customDomain?: string;
}): WithContext<WebSite> {
  const url = getCanonicalUrl({
    organizationSlug: teamSlug,
    siteSlug: siteSlug ?? "",
    customDomain,
  });

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteTitle,
    url,
    ...(siteDescription ? { description: siteDescription } : {}),
  };
}

/**
 * Build BreadcrumbList JSON-LD for page navigation.
 */
export function buildBreadcrumbJsonLd({
  teamSlug,
  siteSlug,
  siteTitle,
  crumbs,
  customDomain,
}: {
  teamSlug: string;
  siteSlug: string;
  siteTitle: string;
  crumbs: Array<{ title: string; slug: string }>;
  customDomain?: string;
}): WithContext<BreadcrumbList> {
  const baseUrl = getCanonicalUrl({
    organizationSlug: teamSlug,
    siteSlug,
    customDomain,
  });

  const items = [
    {
      "@type": "ListItem" as const,
      position: 1,
      name: siteTitle,
      item: baseUrl,
    },
    ...crumbs.map((crumb, index) => ({
      "@type": "ListItem" as const,
      position: index + 2,
      name: crumb.title,
      item: `${baseUrl}/${crumb.slug}`,
    })),
  ];

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

/**
 * Serialize JSON-LD to a safe HTML string for use in script tags.
 * Escapes `<` to prevent XSS via injected `</script>` tags.
 */
function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Renders a `<script type="application/ld+json">` tag with sanitized JSON-LD data.
 * Uses dangerouslySetInnerHTML as recommended by Next.js docs for structured data.
 */
export function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json">{serializeJsonLd(data)}</script>;
}
