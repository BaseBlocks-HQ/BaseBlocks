import { source } from "@/features/marketing/content-pages/source";
import {
  resolveCustomDomain,
  resolvePublishedSitemap,
} from "@/features/published-sites/read-model";
import { encodePath, parseRequestHost } from "@/lib/routing/hosts";
import { getMarketingOrigin, getPublishedOrigin } from "@/lib/seo/site-url";
import type { MetadataRoute } from "next";
import { headers } from "next/headers";

const ORIGIN = getMarketingOrigin();

function marketingSitemap(): MetadataRoute.Sitemap {
  const urls = new Set<string>(["/", "/fr"]);

  for (const page of source.getPages()) urls.add(page.url);

  return [...urls].sort().map((pathname) => ({
    url: new URL(pathname || "/", ORIGIN).toString(),
    changeFrequency: pathname.includes("/docs/legal") ? "yearly" : "monthly",
    priority: pathname === "/" || pathname === "/fr" ? 1 : 0.7,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const parsedHost = parseRequestHost(host);

  if (
    parsedHost.kind === "root" ||
    parsedHost.kind === "www" ||
    parsedHost.kind === "localhost" ||
    parsedHost.kind === "vercel-deployment"
  ) {
    return marketingSitemap();
  }

  let organizationSlug: string;
  let siteSlug: string | undefined;
  let origin: string;
  const isCustomDomain = parsedHost.kind === "custom-domain";

  if (isCustomDomain) {
    const mapping = await resolveCustomDomain(parsedHost.hostname);
    if (!mapping) return [];
    organizationSlug = mapping.organizationSlug;
    siteSlug = mapping.siteSlug;
    origin = getPublishedOrigin(parsedHost.hostname);
  } else {
    organizationSlug = parsedHost.organizationSlug;
    origin = getPublishedOrigin(parsedHost.hostname);
  }

  const sites = await resolvePublishedSitemap(organizationSlug, siteSlug);
  return sites.flatMap((site) =>
    site.pages.map((page) => {
      const path = encodePath(
        isCustomDomain ? page.path : [site.siteSlug, ...page.path],
      );
      return {
        url: `${origin}/${path}`,
        lastModified: new Date(Math.max(site.updatedAt, page.updatedAt)),
        changeFrequency: "weekly" as const,
        priority: page.path.length === 0 ? 1 : 0.7,
      };
    }),
  );
}
