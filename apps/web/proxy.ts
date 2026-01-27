import { type NextRequest, NextResponse } from "next/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "baseblocks.dev";

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
    return parts.length > 0 ? (parts[0] || null) : null;
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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

export const proxyConfig = {
  matcher: [
    // Match all paths except API routes, Next.js internals, and static files
    "/((?!api|_next|_vercel|favicon.ico|.*\\..*).*)",
  ],
};
