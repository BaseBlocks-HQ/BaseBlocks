"use client";

import { AccessGate } from "@/modules/public-site/access-gate";
import { PublicSiteLayout } from "@/modules/public-site/public-site-layout";
import { SiteNotFound } from "@/modules/public-site/site-not-found";
import { SiteNotPublished } from "@/modules/public-site/site-not-published";
import { SitePrivate } from "@/modules/public-site/site-private";
import { api } from "@baseblocks/backend";
import { Spinner } from "@baseblocks/ui/spinner";
import { useQuery } from "convex/react";

type Props = {
  subdomain: string;
  path: string[];
};

/**
 * Public site page - displays published content
 * All logic is encapsulated in PublicSiteLayout component
 */
export function PublicSitePageClient({ subdomain, path }: Props) {
  // path[0] is the site slug, path[1:] is the page path
  const siteSlug = path[0] || "";
  // Empty array = "show the default page", backend resolves via defaultPageId
  const pagePath = path.length > 1 ? path.slice(1) : [];

  const site = useQuery(api.sites.queries.getBySlug, {
    teamSlug: subdomain,
    siteSlug,
  });
  const team = useQuery(api.teams.queries.getBySlug, {
    slug: subdomain,
  });

  if (site === undefined || team === undefined) {
    return <PublicSiteLoading />;
  }

  if (!site || !team) {
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
        <PublicSiteLayout site={site} team={team} pagePath={pagePath} />
      </AccessGate>
    );
  }

  return <PublicSiteLayout site={site} team={team} pagePath={pagePath} />;
}

function PublicSiteLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}
