import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { extractTeamSlug } from "./lib/domains";

// Create the next-intl middleware
const intlMiddleware = createIntlMiddleware(routing);

// Remove locale prefix from pathname if present
function removeLocalePrefix(pathname: string): string {
  const localePattern = new RegExp(`^/(${routing.locales.join("|")})`);
  return pathname.replace(localePattern, "") || "/";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";

  // Safety net: skip Next.js internals that may still invoke proxy despite matcher
  if (pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const teamSlug = extractTeamSlug(host);

  // No subdomain = main app (landing, dashboard, auth)
  if (!teamSlug) {
    return intlMiddleware(request);
  }

  // Custom domain — rewrite to custom domain handler
  if (teamSlug.startsWith("custom:")) {
    const customDomain = teamSlug.replace("custom:", "");
    const url = request.nextUrl.clone();
    const pathnameWithoutLocale = removeLocalePrefix(pathname);
    url.pathname = `/${routing.defaultLocale}/site/_custom/${encodeURIComponent(customDomain)}${pathnameWithoutLocale}`;
    return NextResponse.rewrite(url);
  }

  // Subdomain = published site
  // Block access to internal routes from subdomains
  const pathnameWithoutLocale = removeLocalePrefix(pathname);
  if (
    pathnameWithoutLocale.startsWith("/dashboard") ||
    pathnameWithoutLocale.startsWith("/onboarding")
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Rewrite subdomain root to dynamic route /[locale]/site/[subdomain]/[...path]
  const url = request.nextUrl.clone();
  const pathSuffix = pathnameWithoutLocale === "/" ? "" : pathnameWithoutLocale;
  url.pathname = `/${routing.defaultLocale}/site/${teamSlug}${pathSuffix}`;
  return NextResponse.rewrite(url);
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
