"use client";

import {
  AccessGate,
  PublicSiteLayout,
  SiteNotFound,
  SiteNotPublished,
  SitePrivate,
} from "@/components/public";
import { PublicSiteSkeleton } from "@/components/skeletons";
import { api } from "@repo/backend";
import { useQuery } from "convex/react";
import { use } from "react";

type Props = {
  params: Promise<{ subdomain: string; path: string[] }>;
};

/**
 * Public site page - displays published content
 * All logic is encapsulated in PublicSiteLayout component
 */
export function PublicSitePageClient({ params }: Props) {
  const { subdomain, path } = use(params);
  // path[0] is the site slug, path[1:] is the page path
  const siteSlug = path[0] || "";
  // Empty array = "show the default page", backend resolves via defaultPageId
  const pagePath = path.length > 1 ? path.slice(1) : [];

  const site = useQuery(api.sites.queries.getBySlug, {
    companySlug: subdomain,
    siteSlug,
  });
  const company = useQuery(api.companies.queries.getBySlug, {
    slug: subdomain,
  });

  if (site === undefined || company === undefined) {
    return <PublicSiteSkeleton />;
  }

  if (!site || !company) {
    return <SiteNotFound subdomain={subdomain} />;
  }

  if (!site.isPublished) {
    return <SiteNotPublished />;
  }

  const visibility = site.visibility ?? "public";
  if (visibility === "private") {
    return <SitePrivate siteName={site.name} />;
  }

  if (visibility === "password") {
    return (
      <AccessGate siteId={site._id} siteName={site.name}>
        <PublicSiteLayout site={site} company={company} pagePath={pagePath} />
      </AccessGate>
    );
  }

  return <PublicSiteLayout site={site} company={company} pagePath={pagePath} />;
}
