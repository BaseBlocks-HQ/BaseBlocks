"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@repo/backend";
import { PublicSiteSkeleton } from "@/components/skeletons";
import {
  PublicSiteLayout,
  SiteNotFound,
  SiteNotPublished,
} from "@/components/public";

type Props = {
  params: Promise<{ subdomain: string; path: string[] }>;
};

/**
 * Public site page - displays published content
 * All logic is encapsulated in PublicSiteLayout component
 */
export default function PublicSitePage({ params }: Props) {
  const { subdomain, path } = use(params);
  const pageSlug = path[0] || "home";

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

  return <PublicSiteLayout site={site} company={company} pageSlug={pageSlug} />;
}
