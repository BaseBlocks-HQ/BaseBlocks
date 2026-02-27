import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "baseblocks.dev";

// Create the next-intl middleware
const intlMiddleware = createIntlMiddleware(routing);

// Check if we're on a vercel.app domain (where wildcard subdomains don't work)
function isVercelAppDomain(hostname: string): boolean {
  return hostname.endsWith(".vercel.app") && !hostname.includes("---");
}

function extractSubdomain(request: NextRequest): string | null {
  const host = request.headers.get("host") || "";
  const hostParts = host.split(":");
  const hostname = hostParts[0] || "";

  // Local development environment - use host header (request.url may use 0.0.0.0 in Next.js 16)
  if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
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

  // Check for custom domain
  if (
    !hostname.endsWith(`.${rootDomainFormatted}`) &&
    hostname !== rootDomainFormatted &&
    hostname !== `www.${rootDomainFormatted}` &&
    !hostname.endsWith(".vercel.app")
  ) {
    return `custom:${hostname}`;
  }

  return null;
}

// Extract subdomain from path-based URL (/s/[subdomain]/...)
function extractSubdomainFromPath(
  pathname: string,
): { subdomain: string; remainingPath: string } | null {
  const match = pathname.match(/^\/s\/([^/]+)(\/.*)?$/);
  if (match?.[1]) {
    return {
      subdomain: match[1],
      remainingPath: match[2] || "/",
    };
  }
  return null;
}

// Remove locale prefix from pathname if present
function removeLocalePrefix(pathname: string): string {
  const localePattern = new RegExp(`^/(${routing.locales.join("|")})`);
  return pathname.replace(localePattern, "") || "/";
}

/**
 * Build a strict per-request Content-Security-Policy header value.
 *
 * Production uses nonce + strict-dynamic (no unsafe-inline, no unsafe-eval).
 * Development adds unsafe-eval because React uses eval() for error overlays.
 *
 * Why nonce-based instead of static:
 *   A static CSP with 'unsafe-inline' offers no real XSS protection — any
 *   injected script runs unchecked. A per-request cryptographic nonce means
 *   only script/style elements we stamp get executed; injected markup is
 *   blocked even if the attacker knows the policy.
 *
 * Why strict-dynamic:
 *   Next.js loads page chunks dynamically via document.createElement('script').
 *   strict-dynamic propagates trust from our nonce'd entry bundle to every
 *   chunk it creates, without us maintaining an URL allowlist.
 *
 * style-src-elem vs style-src-attr:
 *   We use style-src-attr 'unsafe-inline' (attribute-level inline styles only)
 *   because the public-site customisation system applies dynamic CSS variables
 *   via React's style={{}} prop — those become style="" attributes at render
 *   time and cannot carry a nonce. style-src-elem remains strict (nonce only),
 *   which is the more dangerous surface (injected <style> blocks).
 */
function buildCSP(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    // PDF.js uses WebAssembly; wasm-unsafe-eval is narrower than unsafe-eval
    // (allows Wasm compilation only, not arbitrary JS eval)
    "'wasm-unsafe-eval'",
    // React error overlay uses eval() in development only
    ...(isDev ? ["'unsafe-eval'"] : []),
  ].join(" ");

  // Dev: add ws://localhost:* for Turbopack HMR websocket
  const connectSrc = [
    "'self'",
    "https://*.convex.cloud",
    "wss://*.convex.cloud",
    "https://*.convex.site",
    ...(isDev ? ["ws://localhost:*", "http://localhost:*"] : []),
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // <style> blocks require nonce; style="" attributes allowed for dynamic colours
    `style-src-elem 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "frame-src https://view.officeapps.live.com https://docs.google.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Only upgrade insecure requests in production; localhost is HTTP by design
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/**
 * Attach CSP header and forward the nonce to server components.
 *
 * Next.js reads x-middleware-request-{name} response headers and injects them
 * as {name} request headers on the page — this is how NextResponse.next(
 * { request: { headers } }) works internally, and what makes headers() in
 * Server Components see the values set here.
 */
function withCSP(
  response: NextResponse,
  nonce: string,
  csp: string,
): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  // Forwarded to server components as the x-nonce request header
  response.headers.set("x-middleware-request-x-nonce", nonce);
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0] || "";

  // Safety net: skip Next.js internals that may still invoke proxy despite matcher
  if (pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  // Per-request nonce — cryptographically random, base64-encoded UUID
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCSP(nonce);

  // Handle path-based routing for vercel.app domains (/s/[subdomain]/...)
  // This is a fallback since wildcard subdomains don't work on vercel.app
  if (isVercelAppDomain(hostname)) {
    const pathBased = extractSubdomainFromPath(pathname);
    if (pathBased) {
      const url = request.nextUrl.clone();
      const pathSuffix =
        pathBased.remainingPath === "/" ? "" : pathBased.remainingPath;
      url.pathname = `/${routing.defaultLocale}/site/${pathBased.subdomain}${pathSuffix}`;
      return withCSP(NextResponse.rewrite(url), nonce, csp);
    }
    // No path-based subdomain, continue to intl middleware
    return withCSP(intlMiddleware(request), nonce, csp);
  }

  const subdomain = extractSubdomain(request);

  // No subdomain = main app (landing, dashboard, auth)
  // Run the intl middleware for locale detection/routing
  if (!subdomain) {
    return withCSP(intlMiddleware(request), nonce, csp);
  }

  // Check if it's a custom domain
  if (subdomain.startsWith("custom:")) {
    const customDomain = subdomain.replace("custom:", "");
    // Rewrite to custom domain handler
    const url = request.nextUrl.clone();
    const pathnameWithoutLocale = removeLocalePrefix(pathname);
    url.pathname = `/${routing.defaultLocale}/site/_custom/${encodeURIComponent(customDomain)}${pathnameWithoutLocale}`;
    return withCSP(NextResponse.rewrite(url), nonce, csp);
  }

  // Subdomain = published site
  // Block access to internal routes from subdomains
  const pathnameWithoutLocale = removeLocalePrefix(pathname);
  if (
    pathnameWithoutLocale.startsWith("/dashboard") ||
    pathnameWithoutLocale.startsWith("/onboarding")
  ) {
    return withCSP(
      NextResponse.redirect(new URL("/", request.url)),
      nonce,
      csp,
    );
  }

  // Rewrite subdomain root to dynamic route /[locale]/site/[subdomain]/[...path]
  // We need to include the locale since the route is under [locale] segment
  const url = request.nextUrl.clone();
  const pathSuffix = pathnameWithoutLocale === "/" ? "" : pathnameWithoutLocale;
  url.pathname = `/${routing.defaultLocale}/site/${subdomain}${pathSuffix}`;
  return withCSP(NextResponse.rewrite(url), nonce, csp);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - Files with extensions (favicon.ico, sitemap.xml, robots.txt, images, etc.)
     */
    "/((?!api|_next/static|_next/image|.*\\..*).*)",
  ],
};
