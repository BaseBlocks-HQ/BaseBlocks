import { type NextRequest, NextResponse } from "next/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "baseblocks.dev";

// Check if we're on a vercel.app domain (where wildcard subdomains don't work)
function isVercelAppDomain(hostname: string): boolean {
  return hostname.endsWith(".vercel.app") && !hostname.includes("---");
}

function extractSubdomain(request: NextRequest): string | null {
  const url = request.url;
  const host = request.headers.get("host") || "";
  const hostParts = host.split(":");
  const hostname = hostParts[0] || "";

  // Local development environment
  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    const fullUrlMatch = url.match(/http:\/\/([^.]+)\.localhost/);
    if (fullUrlMatch?.[1]) {
      return fullUrlMatch[1];
    }
    if (hostname.includes(".localhost")) {
      const subdomain = hostname.split(".")[0];
      return subdomain || null;
    }
    return null;
  }

  // Production environment
  const rootDomainParts = ROOT_DOMAIN.split(":");
  const rootDomainFormatted = rootDomainParts[0] || ROOT_DOMAIN;

  // Handle Vercel preview URLs (tenant---branch.vercel.app)
  if (hostname.includes("---") && hostname.endsWith(".vercel.app")) {
    const parts = hostname.split("---");
    return parts.length > 0 ? parts[0] || null : null;
  }

  // Regular subdomain detection
  const isSubdomain =
    hostname !== rootDomainFormatted &&
    hostname !== `www.${rootDomainFormatted}` &&
    hostname.endsWith(`.${rootDomainFormatted}`);

  if (isSubdomain) {
    return hostname.replace(`.${rootDomainFormatted}`, "");
  }

  // Check for custom domain (not a subdomain of root domain)
  // This would be something like docs.acme.com
  if (
    !hostname.endsWith(`.${rootDomainFormatted}`) &&
    hostname !== rootDomainFormatted &&
    hostname !== `www.${rootDomainFormatted}` &&
    !hostname.includes("localhost") &&
    !hostname.endsWith(".vercel.app")
  ) {
    // This is a custom domain - we need to look it up
    // For now, return the full hostname as the "subdomain" identifier
    // The app will need to look up the company by custom domain
    return `custom:${hostname}`;
  }

  return null;
}

// Extract subdomain from path-based URL (/s/[subdomain]/...)
function extractSubdomainFromPath(pathname: string): { subdomain: string; remainingPath: string } | null {
  const match = pathname.match(/^\/s\/([^/]+)(\/.*)?$/);
  if (match?.[1]) {
    return {
      subdomain: match[1],
      remainingPath: match[2] || "/",
    };
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0] || "";

  // Safety net: skip Next.js internals that may still invoke proxy despite matcher
  if (pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  // Handle path-based routing for vercel.app domains (/s/[subdomain]/...)
  // This is a fallback since wildcard subdomains don't work on vercel.app
  if (isVercelAppDomain(hostname)) {
    const pathBased = extractSubdomainFromPath(pathname);
    if (pathBased) {
      const url = request.nextUrl.clone();
      url.pathname = `/site/${pathBased.subdomain}${pathBased.remainingPath === "/" ? "" : pathBased.remainingPath}`;
      return NextResponse.rewrite(url);
    }
    // No path-based subdomain, continue to main app
    return NextResponse.next();
  }

  const subdomain = extractSubdomain(request);

  // No subdomain = main app (landing, dashboard, auth)
  if (!subdomain) {
    return NextResponse.next();
  }

  // Check if it's a custom domain
  if (subdomain.startsWith("custom:")) {
    const customDomain = subdomain.replace("custom:", "");
    // Rewrite to custom domain handler
    const url = request.nextUrl.clone();
    url.pathname = `/site/_custom/${encodeURIComponent(customDomain)}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Subdomain = published site
  // Block access to internal routes from subdomains
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Rewrite subdomain root to dynamic route /site/[subdomain]/[...path]
  const url = request.nextUrl.clone();
  url.pathname = `/site/${subdomain}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
