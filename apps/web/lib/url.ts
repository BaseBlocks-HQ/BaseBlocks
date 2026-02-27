import { isPreviewDomain } from "./domains";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "baseblocks.dev";

/** Extract team slug from path-based URL (/s/team/...) on preview domains. */
function getPreviewTeamSlug(): string | null {
  if (typeof window === "undefined") return null;
  const match = window.location.pathname.match(/^\/s\/([^/]+)/);
  return match?.[1] || null;
}

/**
 * Generate the URL for a published site.
 * - Production: subdomain-based (team.baseblocks.dev/site/page)
 * - Preview: path-based (origin/s/team/site/page)
 */
export function getSiteUrl(
  teamSlug: string,
  siteSlug: string,
  pagePath?: string,
): string {
  const path = pagePath ? `/${siteSlug}/${pagePath}` : `/${siteSlug}`;
  if (isPreviewDomain()) {
    return `${window.location.origin}/s/${teamSlug}${path}`;
  }
  return `https://${teamSlug}.${ROOT_DOMAIN}${path}`;
}

/**
 * Get the display domain for a team (for showing to users).
 */
export function getDisplayDomain(teamSlug: string): string {
  if (isPreviewDomain()) {
    return `${window.location.host}/s/${teamSlug}`;
  }
  return `${teamSlug}.${ROOT_DOMAIN}`;
}

/**
 * Generate an internal page link within a published site.
 */
export function getPageLink(siteSlug: string, pageSlug: string): string {
  const previewTeam = getPreviewTeamSlug();
  if (previewTeam) {
    return `/s/${previewTeam}/${siteSlug}/${pageSlug}`;
  }
  return `/${siteSlug}/${pageSlug}`;
}
