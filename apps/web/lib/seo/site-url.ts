const DEFAULT_SITE_URL = "https://baseblocks.dev";

export function getMarketingSiteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || fallbackUrl();
  const url = new URL(configured);

  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an origin without a path");
  }

  return url;
}

function fallbackUrl(): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  if (!rootDomain) return DEFAULT_SITE_URL;
  const protocol =
    rootDomain.startsWith("localhost") || rootDomain.startsWith("127.0.0.1")
      ? "http"
      : "https";
  return `${protocol}://${rootDomain}`;
}

export function getMarketingOrigin(): string {
  return getMarketingSiteUrl().origin;
}

export function getPublishedOrigin(hostname: string): string {
  const siteUrl = getMarketingSiteUrl();
  const isAudit =
    process.env.BASEBLOCKS_SEO_AUDIT === "1" && process.env.VERCEL !== "1";
  const isLocalhost =
    hostname === "localhost" || hostname.endsWith(".localhost");

  if (isAudit || isLocalhost) {
    const port = siteUrl.port ? `:${siteUrl.port}` : "";
    return `${siteUrl.protocol}//${hostname}${port}`;
  }

  return `https://${hostname}`;
}
