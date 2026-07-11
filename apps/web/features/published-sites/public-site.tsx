"use client";

import { AccessGate } from "@/features/published-sites/access-gate";
import { PublicSiteShell } from "@/features/published-sites/shell";
import { PublicSiteState } from "@/features/published-sites/states";
import { getStoredAccessSessionTokens } from "./access-session";
import type { PublishedPageResult } from "./read-model";
import { api } from "@baseblocks/backend";
import { useQuery } from "convex/react";

type Props = {
  result: PublishedPageResult | null;
  organizationSlug: string;
  siteSlug?: string;
  pagePath: string[];
};

export function PublicSite({
  result,
  organizationSlug,
  siteSlug,
  pagePath,
}: Props) {
  if (!result) {
    return (
      <PublicSiteState kind="site-not-found" teamSlug={organizationSlug} />
    );
  }

  const visibility = result.access.visibility;
  if (visibility === "private") {
    return <PublicSiteState kind="site-private" siteName={result.site.name} />;
  }

  if (visibility === "password") {
    return (
      <AccessGate siteId={result.site._id} siteName={result.site.name}>
        <UnlockedPublicSite
          organizationSlug={organizationSlug}
          siteSlug={siteSlug ?? result.site.slug}
          pagePath={pagePath}
        />
      </AccessGate>
    );
  }

  return <ResolvedPublicSite result={result} />;
}

function UnlockedPublicSite({
  organizationSlug,
  siteSlug,
  pagePath,
}: {
  organizationSlug: string;
  siteSlug: string;
  pagePath: string[];
}) {
  const result = useQuery(api.published.resolve, {
    organizationSlug,
    siteSlug,
    pagePath,
    sessionTokens: getStoredAccessSessionTokens(),
  });

  if (result === undefined) return <PublicSiteState kind="loading" />;
  if (!result) {
    return (
      <PublicSiteState kind="site-not-found" teamSlug={organizationSlug} />
    );
  }
  return <ResolvedPublicSite result={result} />;
}

function ResolvedPublicSite({ result }: { result: PublishedPageResult }) {
  if (result.access.status === "forbidden") {
    return <PublicSiteState kind="page-forbidden" />;
  }
  if (result.access.status === "missing") {
    return <PublicSiteState kind="page-not-found" />;
  }
  if (!result.page) return <PublicSiteState kind="empty" />;
  return <PublicSiteShell result={result} />;
}
