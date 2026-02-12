import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "baseblocks.dev";

/**
 * Check if we're currently on a vercel.app domain (client-side only)
 * Vercel.app domains don't support wildcard subdomains, so we use path-based routing
 */
export function isVercelAppDomain(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return hostname.endsWith(".vercel.app") && !hostname.includes("---");
}

/**
 * Generate the URL for a published site
 * - On vercel.app: uses path-based routing (e.g., /s/company/site-slug/page)
 * - On custom domain: uses subdomain-based routing (e.g., company.baseblocks.dev/site-slug/page)
 */
export function getSiteUrl(
  companySlug: string,
  siteSlug: string,
  pagePath?: string,
): string {
  const path = pagePath ? `/${siteSlug}/${pagePath}` : `/${siteSlug}`;

  if (typeof window !== "undefined" && isVercelAppDomain()) {
    // Path-based routing for vercel.app
    return `${window.location.origin}/s/${companySlug}${path}`;
  }

  // Subdomain-based routing for custom domains
  return `https://${companySlug}.${ROOT_DOMAIN}${path}`;
}

/**
 * Get the display domain for a company (for showing to users)
 */
export function getDisplayDomain(companySlug: string): string {
  if (typeof window !== "undefined" && isVercelAppDomain()) {
    return `${window.location.host}/s/${companySlug}`;
  }
  return `${companySlug}.${ROOT_DOMAIN}`;
}

/**
 * Check if we're currently within a path-based site context (/s/[subdomain]/...)
 * Returns the subdomain if we are, null otherwise
 */
export function getPathBasedSubdomain(): string | null {
  if (typeof window === "undefined") return null;
  const match = window.location.pathname.match(/^\/s\/([^/]+)/);
  return match?.[1] || null;
}

/**
 * Generate an internal page link within a published site
 * - If in path-based context: /s/company/site-slug/page-slug
 * - If in subdomain context: /site-slug/page-slug
 */
export function getPageLink(siteSlug: string, pageSlug: string): string {
  const pathSubdomain = getPathBasedSubdomain();
  if (pathSubdomain) {
    return `/s/${pathSubdomain}/${siteSlug}/${pageSlug}`;
  }
  return `/${siteSlug}/${pageSlug}`;
}
