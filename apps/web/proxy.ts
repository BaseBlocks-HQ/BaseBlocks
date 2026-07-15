import { parseRequestHost } from "@/lib/routing/hosts";
import { isLocale, normalizeLocale, type Locale } from "@baseblocks/i18n";
import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

function readPublicLocale(request: NextRequest): {
  explicit: boolean;
  locale: Locale;
  pathname: string;
} {
  const prefix = request.nextUrl.pathname.split("/")[1];
  if (isLocale(prefix)) {
    return {
      explicit: true,
      locale: prefix,
      pathname: request.nextUrl.pathname.replace(`/${prefix}`, "") || "/",
    };
  }

  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (isLocale(cookieLocale)) {
    return {
      explicit: false,
      locale: cookieLocale,
      pathname: request.nextUrl.pathname,
    };
  }

  const acceptedLanguages = (request.headers.get("accept-language") ?? "")
    .split(",")
    .map((part) => {
      const [language = "", quality = "q=1"] = part.trim().split(";");
      return {
        locale: normalizeLocale(language),
        quality: Number(quality.replace(/^q=/, "")) || 0,
      };
    })
    .filter(
      (entry): entry is { locale: Locale; quality: number } =>
        entry.locale !== null,
    )
    .sort((a, b) => b.quality - a.quality);

  return {
    explicit: false,
    locale: acceptedLanguages[0]?.locale ?? routing.defaultLocale,
    pathname: request.nextUrl.pathname,
  };
}

function publishedPath(
  kind: "domain" | "subdomain",
  tenant: string,
  pathname: string,
  locale: Locale,
): string {
  const suffix = pathname === "/" ? "" : pathname;
  return `/${locale}/published/${kind}/${encodeURIComponent(tenant)}${suffix}`;
}

function rewritePublishedRequest(
  request: NextRequest,
  url: URL,
  publicRequest: ReturnType<typeof readPublicLocale>,
) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-next-intl-locale", publicRequest.locale);
  const response = NextResponse.rewrite(url, {
    request: { headers: requestHeaders },
  });
  if (publicRequest.explicit) {
    response.cookies.set("NEXT_LOCALE", publicRequest.locale, {
      maxAge: 31_536_000,
      path: "/",
      sameSite: "lax",
    });
  }
  return response;
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

  const publicRequest = readPublicLocale(request);
  const url = request.nextUrl.clone();

  if (parsedHost.kind === "custom-domain") {
    url.pathname = publishedPath(
      "domain",
      parsedHost.hostname,
      publicRequest.pathname,
      publicRequest.locale,
    );
    return rewritePublishedRequest(request, url, publicRequest);
  }

  const organizationSlug = parsedHost.organizationSlug;
  url.pathname = publishedPath(
    "subdomain",
    organizationSlug,
    publicRequest.pathname,
    publicRequest.locale,
  );
  return rewritePublishedRequest(request, url, publicRequest);
}

export const config = {
  matcher: ["/((?!api|opengraph-image|_next/static|_next/image|.*\\..*).*)"],
};
