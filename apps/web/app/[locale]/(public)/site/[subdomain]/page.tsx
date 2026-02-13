"use client";

import { AccessGate, SitePrivate } from "@/components/public";
import { PublicSiteSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { getPageLink } from "@/lib/utils";
import { api } from "@repo/backend";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { use, useEffect } from "react";

type Props = {
  params: Promise<{ subdomain: string }>;
};

export default function SubdomainRootPage({ params }: Props) {
  const { subdomain } = use(params);
  const router = useRouter();

  const siteData = useQuery(api.sites.queries.getWithDefaultPage, {
    companySlug: subdomain,
  });

  useEffect(() => {
    if (siteData === undefined) return; // Still loading

    if (!siteData || !siteData.defaultPage) {
      return;
    }

    // Check visibility before redirecting
    const visibility = siteData.site.visibility ?? "public";
    if (visibility === "private" || visibility === "password") {
      // Don't redirect, we'll handle visibility in the render
      return;
    }

    // Redirect to the default page, including the site slug in the URL
    router.replace(
      getPageLink(siteData.site.slug, siteData.defaultPage.slug),
    );
  }, [siteData, subdomain, router]);

  // Handle visibility before showing loading state
  if (siteData && siteData.site) {
    const visibility = siteData.site.visibility ?? "public";

    // Private sites require authentication
    if (visibility === "private") {
      return <SitePrivate siteName={siteData.site.name} />;
    }

    // Password-protected sites require access code verification
    if (visibility === "password") {
      // Once access is granted, redirect to default page
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

  // Show loading state while redirecting
  return <PublicSiteSkeleton />;
}

// Helper component to redirect after access is granted
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
