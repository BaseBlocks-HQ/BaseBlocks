const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "baseblocks.dev";
const CANONICAL_ROOT_DOMAIN = ROOT_DOMAIN.split(":")[0] || ROOT_DOMAIN;

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
 * Generate a site URL that works correctly in every environment.
 * Client-side only — falls back to canonical URL on the server.
 *
 * - Production: https://team.baseblocks.dev/site (canonical subdomain)
 * - Localhost / Vercel preview: /s/team/site (path-based, handled by proxy)
 */
export function getSiteOpenUrl(teamSlug: string, siteSlug: string): string {
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (
      hostname === CANONICAL_ROOT_DOMAIN ||
      hostname.endsWith(`.${CANONICAL_ROOT_DOMAIN}`)
    ) {
      return getSiteUrl(teamSlug, siteSlug);
    }
    return `/s/${teamSlug}/${siteSlug}`;
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
