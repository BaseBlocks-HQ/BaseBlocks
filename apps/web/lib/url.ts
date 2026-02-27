const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "baseblocks.dev";

/**
 * Generate the canonical URL for a published site.
 * Always uses subdomain-based routing: team.baseblocks.dev/site/page
 */
export function getSiteUrl(
  teamSlug: string,
  siteSlug: string,
  pagePath?: string,
): string {
  const path = pagePath ? `/${siteSlug}/${pagePath}` : `/${siteSlug}`;
  return `https://${teamSlug}.${ROOT_DOMAIN}${path}`;
}

/**
 * Generate a site URL that works on the current domain.
 * Client-side only — falls back to canonical URL on the server.
 *
 * - Localhost: http://team.localhost:port/site
 * - Vercel preview: /s/team/site (path-based, handled by proxy)
 * - Production: https://team.baseblocks.dev/site
 */
export function getPreviewSiteUrl(
  teamSlug: string,
  siteSlug: string,
): string {
  if (typeof window !== "undefined") {
    const { hostname, port } = window.location;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".localhost")
    ) {
      return `http://${teamSlug}.localhost:${port || "3000"}/${siteSlug}`;
    }
    if (hostname.endsWith(".vercel.app")) {
      return `/s/${teamSlug}/${siteSlug}`;
    }
  }
  return getSiteUrl(teamSlug, siteSlug);
}

/**
 * Get the display domain for a team (for showing to users).
 */
export function getDisplayDomain(teamSlug: string): string {
  return `${teamSlug}.${ROOT_DOMAIN}`;
}

/**
 * Generate an internal page link within a published site.
 */
export function getPageLink(siteSlug: string, pageSlug: string): string {
  return `/${siteSlug}/${pageSlug}`;
}
