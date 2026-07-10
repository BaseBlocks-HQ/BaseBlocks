import {
  encodePath,
  getRootDomain,
  normalizeHostname,
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

function getCustomDomainUrl(
  hostname: string,
  pagePath?: string | string[],
): string {
  const path = encodePath(normalizePathSegments(pagePath));
  return `https://${normalizeHostname(hostname)}${path ? `/${path}` : ""}`;
}

export function getCanonicalUrl(input: {
  organizationSlug: string;
  siteSlug: string;
  pagePath?: string | string[];
  customDomain?: string;
}): string {
  return input.customDomain
    ? getCustomDomainUrl(input.customDomain, input.pagePath)
    : getSiteUrl(input.organizationSlug, input.siteSlug, input.pagePath);
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
  if (parsed.kind === "vercel-deployment") {
    return getSiteUrl(organizationSlug, siteSlug);
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
