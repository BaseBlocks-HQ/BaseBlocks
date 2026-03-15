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

// App routes that should never be rewritten to site routes
function isAppRoute(path: string): boolean {
  return (
    path === "/" ||
    path.startsWith("/dashboard") ||
    path.startsWith("/onboarding") ||
    path.startsWith("/auth") ||
    path.startsWith("/login") ||
    path.startsWith("/sites")
  );
}

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "baseblocks.dev";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";

  // Safety net: skip Next.js internals that may still invoke proxy despite matcher
  if (pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  // Canonical domain: redirect www → non-www to keep a single origin for auth
  const hostname = host.split(":")[0] || "";
  if (hostname === `www.${ROOT_DOMAIN}`) {
    const url = request.nextUrl.clone();
    url.host = ROOT_DOMAIN;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  // Path-based site entry: /s/team/[...path]
  // Works on all environments — used by the editor "View Site" button on
  // localhost and Vercel preview deploys where subdomains aren't available.
  const sPathMatch = pathname.match(/^\/s\/([^/]+)(\/.*)?$/);
  if (sPathMatch?.[1]) {
    const teamSlug = sPathMatch[1];
    const remaining = sPathMatch[2] || "/";
    const pathSuffix = remaining === "/" ? "" : remaining;
    const url = request.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}/site/${teamSlug}${pathSuffix}`;

    // Vercel preview: also set a cookie so subsequent in-site navigation
    // (/{siteSlug}/{pageSlug}) can be rewritten without the /s/ prefix.
    if (hostname.endsWith(".vercel.app")) {
      const response = NextResponse.rewrite(url);
      response.cookies.set("__preview_team", teamSlug, {
        path: "/",
        sameSite: "lax",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
      return response;
    }

    return NextResponse.rewrite(url);
  }

  // Vercel preview domains don't support subdomains — handle implicit
  // in-site navigation via the __preview_team cookie set above.
  if (hostname.endsWith(".vercel.app")) {
    const previewTeam = request.cookies.get("__preview_team")?.value;
    const pathWithoutLocale = removeLocalePrefix(pathname);

    if (previewTeam && !isAppRoute(pathWithoutLocale)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${routing.defaultLocale}/site/${previewTeam}${pathWithoutLocale}`;
      return NextResponse.rewrite(url);
    }

    return intlMiddleware(request);
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
    pathnameWithoutLocale.startsWith("/onboarding") ||
    pathnameWithoutLocale.startsWith("/login")
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
