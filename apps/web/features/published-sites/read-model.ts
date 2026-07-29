import "server-only";

import { getToken } from "@/lib/auth/server";
import { getServerConvexClient } from "@/lib/convex/server";
import { normalizeHostname } from "@/lib/routing/hosts";
import { api } from "@baseblocks/backend";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import {
  resolveSeoAuditCustomDomain,
  resolveSeoAuditPage,
  resolveSeoAuditSitemap,
} from "./seo-audit-fixtures";

async function queryPublishedPage(
  organizationSlug: string,
  siteSlug: string | undefined,
  pagePath: string[],
) {
  const token = await getToken();
  return getServerConvexClient(token).query(api.published.resolve, {
    organizationSlug,
    siteSlug,
    pagePath,
  });
}

const queryCustomDomain = unstable_cache(
  (hostname: string) =>
    getServerConvexClient().query(api.siteDomains.resolve, { hostname }),
  ["published-custom-domain"],
  { revalidate: 300 },
);

const queryPublishedSitemap = unstable_cache(
  (organizationSlug: string, siteSlug?: string) =>
    getServerConvexClient().query(api.published.sitemap, {
      organizationSlug,
      siteSlug,
    }),
  ["published-sitemap"],
  { revalidate: 300 },
);

export type PublishedPageResolution = NonNullable<
  Awaited<ReturnType<typeof queryPublishedPage>>
>;
export type PublishedPageResult = Extract<
  PublishedPageResolution,
  { access: { status: "accessible" } }
>;

export function isAccessiblePublishedPage(
  result: PublishedPageResolution | null,
): result is PublishedPageResult {
  return result?.access.status === "accessible";
}

export const resolvePublishedPage = cache(
  async (
    organizationSlug: string,
    siteSlug: string | undefined,
    pagePath: string[],
  ): Promise<PublishedPageResolution | null> => {
    const fixture = resolveSeoAuditPage(organizationSlug, siteSlug, pagePath);
    if (fixture !== undefined) {
      return fixture as PublishedPageResolution | null;
    }
    return queryPublishedPage(organizationSlug, siteSlug, pagePath);
  },
);

export const resolveCustomDomain = cache((hostname: string) => {
  const normalizedHostname = normalizeHostname(hostname);
  const fixture = resolveSeoAuditCustomDomain(normalizedHostname);
  if (fixture) return Promise.resolve(fixture);
  return queryCustomDomain(normalizedHostname);
});

export const resolvePublishedSitemap = cache(
  (organizationSlug: string, siteSlug?: string) => {
    const fixture = resolveSeoAuditSitemap(organizationSlug, siteSlug);
    if (fixture) return Promise.resolve(fixture);
    return queryPublishedSitemap(organizationSlug, siteSlug) as Promise<
      Array<{
        siteSlug: string;
        updatedAt: number;
        pages: Array<{ path: string[]; updatedAt: number }>;
      }>
    >;
  },
);
