"use client";

import { getStoredAccessSessionTokens } from "@/modules/public-site/access-session";
import { getPageLink } from "@/modules/public-site/urls";
import { AccessGate } from "@/modules/public-site/access-gate";
import { PublicSiteState } from "@/modules/public-site/states";
import { api } from "@baseblocks/backend";
import { Spinner } from "@baseblocks/ui/spinner";
import { useQuery } from "convex/react";
import { redirect } from "next/navigation";

type Props = {
  teamSlug: string;
};

export function PublicSiteRoot({ teamSlug }: Props) {
  const sessionTokens = getStoredAccessSessionTokens();
  const siteData = useQuery(api.sites.queries.getWithDefaultPage, {
    teamSlug,
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
      return (
        <PublicSiteState kind="site-private" siteName={siteData.site.name} />
      );
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
      return <PublicSiteState kind="empty" />;
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
  return <PublicSiteState kind="loading" />;
}
