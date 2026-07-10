import { parseRequestHost } from "@/modules/tenancy/host";
import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

function removeLocalePrefix(pathname: string): string {
  const localePattern = new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`);
  return pathname.replace(localePattern, "") || "/";
}

function publishedPath(
  kind: "domain" | "subdomain",
  tenant: string,
  pathname: string,
): string {
  const suffix = pathname === "/" ? "" : pathname;
  return `/${routing.defaultLocale}/published/${kind}/${encodeURIComponent(tenant)}${suffix}`;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/_next")) return NextResponse.next();

  const parsedHost = parseRequestHost(
    request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      "",
  );

  if (parsedHost.kind === "www") {
    const url = request.nextUrl.clone();
    url.hostname = parsedHost.hostname.slice(4);
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  if (
    parsedHost.kind === "root" ||
    parsedHost.kind === "localhost" ||
    parsedHost.kind === "vercel-deployment"
  ) {
    return intlMiddleware(request);
  }

  const path = removeLocalePrefix(pathname);
  const url = request.nextUrl.clone();

  if (parsedHost.kind === "custom-domain") {
    url.pathname = publishedPath("domain", parsedHost.hostname, path);
    return NextResponse.rewrite(url);
  }

  const organizationSlug = parsedHost.organizationSlug;
  url.pathname = publishedPath("subdomain", organizationSlug, path);
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!api|opengraph-image|_next/static|_next/image|.*\\..*).*)"],
};
