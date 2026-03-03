import "server-only";

import type { BreadcrumbList, WebSite, WithContext } from "schema-dts";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "baseblocks.dev";

/**
 * Build WebSite JSON-LD for a public site.
 */
export function buildWebSiteJsonLd({
  siteTitle,
  siteDescription,
  teamSlug,
  siteSlug,
}: {
  siteTitle: string;
  siteDescription?: string;
  teamSlug: string;
  siteSlug?: string;
}): WithContext<WebSite> {
  const url = siteSlug
    ? `https://${teamSlug}.${ROOT_DOMAIN}/${siteSlug}`
    : `https://${teamSlug}.${ROOT_DOMAIN}`;

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
}: {
  teamSlug: string;
  siteSlug: string;
  siteTitle: string;
  crumbs: Array<{ title: string; slug: string }>;
}): WithContext<BreadcrumbList> {
  const baseUrl = `https://${teamSlug}.${ROOT_DOMAIN}/${siteSlug}`;

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
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Required for JSON-LD per Next.js docs — data is sanitized via serializeJsonLd
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
