"use client";

import { getStoredAccessSessionTokens } from "@/lib/public-site/access-session";
import { getPageLink } from "@/lib/url";
import { AccessGate, SitePrivate } from "@/modules/public-site";
import { api } from "@baseblocks/backend";
import { Spinner } from "@baseblocks/ui/spinner";
import { useQuery } from "convex/react";
import { redirect } from "next/navigation";

type Props = {
  subdomain: string;
};

export function SubdomainRootPageClient({ subdomain }: Props) {
  const sessionTokens = getStoredAccessSessionTokens();
  const siteData = useQuery(api.sites.queries.getWithDefaultPage, {
    teamSlug: subdomain,
    sessionTokens,
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

    if (!siteData.defaultPage) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center">
          <p className="text-muted-foreground">
            No accessible pages are available on this site yet.
          </p>
        </div>
      );
    }
  }

  return <PublicSiteLoading />;
}

function RedirectToDefaultPage({
  siteSlug,
  defaultPageSlug,
}: {
  siteSlug: string;
  defaultPageSlug?: string;
}) {
  redirect(getPageLink(siteSlug, defaultPageSlug ?? "home"));

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}

function PublicSiteLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}
