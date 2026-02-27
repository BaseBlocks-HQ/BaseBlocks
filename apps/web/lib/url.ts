const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "baseblocks.dev";

/**
 * Generate the URL for a published site.
 * Always uses subdomain-based routing: team.baseblocks.dev/site-slug/page
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
