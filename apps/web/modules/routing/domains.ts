const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "baseblocks.dev";

/**
 * Extract team slug from a request host header.
 *
 * Returns:
 * - The team slug for subdomain requests (e.g. "acme" from "acme.baseblocks.dev")
 * - "custom:{hostname}" for custom domain requests
 * - null for root domain / localhost without subdomain
 *
 * Edge-runtime safe — pure string manipulation, no Node APIs.
 */
export function extractTeamSlug(host: string): string | null {
  const hostname = host.split(":")[0] || "";

  // Local dev: tenant.localhost
  if (hostname.includes(".localhost")) {
    return hostname.split(".")[0] || null;
  }

  // Plain localhost / 127.0.0.1 — no subdomain
  if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
    return null;
  }

  const rootDomain = ROOT_DOMAIN.split(":")[0] || ROOT_DOMAIN;

  // Regular subdomain: tenant.baseblocks.dev
  if (
    hostname !== rootDomain &&
    hostname !== `www.${rootDomain}` &&
    hostname.endsWith(`.${rootDomain}`)
  ) {
    return hostname.replace(`.${rootDomain}`, "");
  }

  // Custom domain (not root domain, not www, not a known subdomain)
  if (hostname !== rootDomain && hostname !== `www.${rootDomain}`) {
    return `custom:${hostname}`;
  }

  return null;
}
