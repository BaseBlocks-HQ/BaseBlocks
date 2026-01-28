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
 * - On vercel.app: uses path-based routing (e.g., /s/company/page)
 * - On custom domain: uses subdomain-based routing (e.g., company.baseblocks.dev/page)
 */
export function getSiteUrl(companySlug: string, pagePath?: string): string {
  const path = pagePath ? `/${pagePath}` : "/";

  if (typeof window !== "undefined" && isVercelAppDomain()) {
    // Path-based routing for vercel.app
    return `/s/${companySlug}${path}`;
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
