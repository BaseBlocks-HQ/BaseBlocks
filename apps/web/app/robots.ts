import { parseRequestHost } from "@/lib/routing/hosts";
import {
  getMarketingOrigin,
  getPublishedOrigin,
} from "@/lib/seo/site-url";
import type { MetadataRoute } from "next";
import { headers } from "next/headers";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const parsedHost = parseRequestHost(host);
  const isCustomerHost = [
    "custom-domain",
    "localhost-subdomain",
    "subdomain",
    "vercel-preview",
  ].includes(parsedHost.kind);

  if (isCustomerHost) {
    return {
      rules: { userAgent: "*", allow: "/" },
      sitemap: `${getPublishedOrigin(parsedHost.hostname)}/sitemap.xml`,
    };
  }

  const isProduction = process.env.VERCEL_ENV === "production";

  // Block crawlers on preview and staging hosts.
  if (!isProduction) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/onboarding/", "/login/", "/api/"],
      },
    ],
    sitemap: `${getMarketingOrigin()}/sitemap.xml`,
  };
}
