"use client";

import { AccessGate, SitePrivate } from "@/features/public-site";
import { PublicSiteSkeleton } from "@/components/skeletons";
import { getPageLink } from "@/lib/url";
import { api } from "@baseblocks/backend";
import { Skeleton } from "@baseblocks/ui/skeleton";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { use, useEffect } from "react";

type Props = {
  params: Promise<{ subdomain: string }>;
};

export function SubdomainRootPageClient({ params }: Props) {
  const { subdomain } = use(params);
  const router = useRouter();

  const siteData = useQuery(api.sites.queries.getWithDefaultPage, {
    teamSlug: subdomain,
  });

  useEffect(() => {
    if (siteData === undefined) return;
    if (!siteData || !siteData.defaultPage) return;

    const visibility = siteData.site.visibility ?? "public";
    if (visibility === "private" || visibility === "password") return;

    router.replace(getPageLink(siteData.site.slug, siteData.defaultPage.slug));
  }, [siteData, router]);

  if (siteData && siteData.site) {
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
  const router = useRouter();

  useEffect(() => {
    router.replace(getPageLink(siteSlug, defaultPageSlug ?? "home"));
  }, [siteSlug, defaultPageSlug, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Skeleton className="h-8 w-48" />
    </div>
  );
}
