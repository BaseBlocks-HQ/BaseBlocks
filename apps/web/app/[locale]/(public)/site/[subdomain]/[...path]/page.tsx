"use client";

import {
  PublicSiteLayout,
  SiteNotFound,
  SiteNotPublished,
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
export default function PublicSitePage({ params }: Props) {
  const { subdomain, path } = use(params);
  // Pass the full path array for nested page support
  const pagePath = path.length > 0 ? path : ["home"];

  const site = useQuery(api.sites.queries.getBySlug, {
    companySlug: subdomain,
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

  return <PublicSiteLayout site={site} company={company} pagePath={pagePath} />;
}
