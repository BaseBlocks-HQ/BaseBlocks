import {
  encodePath,
  getRootDomain,
  normalizePathSegments,
  parseRequestHost,
} from "@/lib/routing/hosts";

function sitePath(siteSlug: string, pagePath?: string | string[]): string {
  return `/${encodePath([siteSlug, ...normalizePathSegments(pagePath)])}`;
}

export function getSiteUrl(
  organizationSlug: string,
  siteSlug: string,
  pagePath?: string | string[],
): string {
  return `https://${organizationSlug}.${getRootDomain()}${sitePath(siteSlug, pagePath)}`;
}

export function getSiteOpenUrl(
  organizationSlug: string,
  siteSlug: string,
): string {
  if (typeof window === "undefined")
    return getSiteUrl(organizationSlug, siteSlug);

  const parsed = parseRequestHost(window.location.host);
  if (parsed.kind === "localhost" || parsed.kind === "localhost-subdomain") {
    const port = window.location.port ? `:${window.location.port}` : "";
    return `${window.location.protocol}//${organizationSlug}.localhost${port}${sitePath(siteSlug)}`;
  }
  return getSiteUrl(organizationSlug, siteSlug);
}

export function getDisplayDomain(organizationSlug: string): string {
  return `${organizationSlug}.${getRootDomain()}`;
}

export function getPageLink(
  siteSlug: string,
  pagePath: string | string[],
): string {
  if (
    typeof window !== "undefined" &&
    parseRequestHost(window.location.host).kind === "custom-domain"
  ) {
    return `/${encodePath(normalizePathSegments(pagePath))}`;
  }
  return sitePath(siteSlug, pagePath);
}
