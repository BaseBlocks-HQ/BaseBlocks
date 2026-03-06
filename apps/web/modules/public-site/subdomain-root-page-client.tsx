"use client";

import { PublicSiteSkeleton } from "@/components/skeletons";
import { getPageLink } from "@/lib/url";
import { AccessGate, SitePrivate } from "@/modules/public-site";
import { api } from "@baseblocks/backend";
import { Skeleton } from "@baseblocks/ui/skeleton";
import { useQuery } from "convex/react";
import { redirect } from "next/navigation";

type Props = {
  subdomain: string;
};

export function SubdomainRootPageClient({ subdomain }: Props) {
  const siteData = useQuery(api.sites.queries.getWithDefaultPage, {
    teamSlug: subdomain,
  });

  if (siteData?.defaultPage) {
    const visibility = siteData.site.visibility ?? "public";
    if (visibility !== "private" && visibility !== "password") {
      redirect(getPageLink(siteData.site.slug, siteData.defaultPage.slug));
    }
  }

  if (siteData?.site) {
    const visibility = siteData.site.visibility ?? "public";

    if (visibility === "private") {
      return <SitePrivate siteName={siteData.site.name} />;
    }

    if (visibility === "password") {
      return (
        <AccessGate siteId={siteData.site._id} siteName={siteData.site.name}>
          <RedirectToDefaultPage
            siteSlug={siteData.site.slug}
            defaultPageSlug={siteData.defaultPage?.slug}
          />
        </AccessGate>
      );
    }
  }

  return <PublicSiteSkeleton />;
}

function RedirectToDefaultPage({
  siteSlug,
  defaultPageSlug,
}: { siteSlug: string; defaultPageSlug?: string }) {
  redirect(getPageLink(siteSlug, defaultPageSlug ?? "home"));

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Skeleton className="h-8 w-48" />
    </div>
  );
}
