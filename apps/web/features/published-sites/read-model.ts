import "server-only";

import { getServerConvexClient } from "@/lib/convex/server";
import { normalizeHostname } from "@/lib/routing/hosts";
import { api } from "@baseblocks/backend";
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
  return getServerConvexClient().query(api.published.resolve, {
    organizationSlug,
    siteSlug,
    pagePath,
  });
}

export type PublishedPageResult = NonNullable<
  Awaited<ReturnType<typeof queryPublishedPage>>
>;

export const resolvePublishedPage = cache(
  async (
    organizationSlug: string,
    siteSlug: string | undefined,
    pagePath: string[],
  ): Promise<PublishedPageResult | null> => {
    const fixture = resolveSeoAuditPage(organizationSlug, siteSlug, pagePath);
    if (fixture !== undefined) {
      return fixture as PublishedPageResult | null;
    }
    return queryPublishedPage(organizationSlug, siteSlug, pagePath);
  },
);

export const resolveCustomDomain = cache((hostname: string) => {
  const fixture = resolveSeoAuditCustomDomain(normalizeHostname(hostname));
  if (fixture) return Promise.resolve(fixture);
  return getServerConvexClient().query(api.siteDomains.resolve, {
    hostname: normalizeHostname(hostname),
  });
});

export const resolvePublishedSitemap = cache(
  (organizationSlug: string, siteSlug?: string) => {
    const fixture = resolveSeoAuditSitemap(organizationSlug, siteSlug);
    if (fixture) return Promise.resolve(fixture);
    return getServerConvexClient().query(api.published.sitemap, {
      organizationSlug,
      siteSlug,
    }) as Promise<
      Array<{
        siteSlug: string;
        updatedAt: number;
        pages: Array<{ path: string[]; updatedAt: number }>;
      }>
    >;
  },
);
