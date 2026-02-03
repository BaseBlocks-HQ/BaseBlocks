"use client";

import { AccessGate, SitePrivate } from "@/components/public";
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
      // No site or no pages - redirect to home as fallback
      router.replace(getPageLink("home"));
      return;
    }

    // Check visibility before redirecting
    const visibility = siteData.site.visibility ?? "public";
    if (visibility === "private" || visibility === "password") {
      // Don't redirect, we'll handle visibility in the render
      return;
    }

    // Redirect to the default page
    // getPageLink handles both subdomain and path-based routing
    router.replace(getPageLink(siteData.defaultPage.slug));
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
          <RedirectToDefaultPage defaultPageSlug={siteData.defaultPage?.slug} />
        </AccessGate>
      );
    }
  }

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Skeleton className="h-8 w-48" />
        </div>
      </header>
      <div className="flex">
        <aside className="w-64 border-r min-h-[calc(100vh-56px)] p-4">
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-8 w-full" />
        </aside>
        <main className="flex-1 p-8">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-10 w-64 mb-8" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </main>
      </div>
    </div>
  );
}

// Helper component to redirect after access is granted
function RedirectToDefaultPage({
  defaultPageSlug,
}: { defaultPageSlug?: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(getPageLink(defaultPageSlug ?? "home"));
  }, [defaultPageSlug, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Skeleton className="h-8 w-48" />
    </div>
  );
}
