"use client";

import { AccessGate } from "@/modules/public-site/access-gate";
import { PublicSiteShell } from "@/modules/public-site/shell";
import { PublicSiteState } from "@/modules/public-site/states";
import { api } from "@baseblocks/backend";
import { useQuery } from "convex/react";

type Props = {
  teamSlug: string;
  path: string[];
};

export function PublicSite({ teamSlug, path }: Props) {
  // path[0] is the site slug, path[1:] is the page path
  const siteSlug = path[0] || "";
  // Empty array = "show the default page", backend resolves via defaultPageId
  const pagePath = path.length > 1 ? path.slice(1) : [];

  const site = useQuery(api.sites.queries.getBySlug, {
    teamSlug,
    siteSlug,
  });
  const team = useQuery(api.teams.queries.getBySlug, {
    slug: teamSlug,
  });

  if (site === undefined || team === undefined) {
    return <PublicSiteLoading />;
  }

  if (!site || !team) {
    return <PublicSiteState kind="site-not-found" teamSlug={teamSlug} />;
  }

  if (!site.isPublished) {
    return <PublicSiteState kind="site-not-published" siteName={site.name} />;
  }

  const visibility = site.visibility ?? "public";
  if (visibility === "private") {
    return <PublicSiteState kind="site-private" siteName={site.name} />;
  }

  if (visibility === "password") {
    return (
      <AccessGate siteId={site._id} siteName={site.name}>
        <PublicSiteShell site={site} team={team} pagePath={pagePath} />
      </AccessGate>
    );
  }

  return <PublicSiteShell site={site} team={team} pagePath={pagePath} />;
}

function PublicSiteLoading() {
  return <PublicSiteState kind="loading" />;
}
