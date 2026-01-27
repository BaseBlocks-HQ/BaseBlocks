"use client";

import { Skeleton } from "@/components/ui/skeleton";
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
      router.replace(`/site/${subdomain}/home`);
      return;
    }

    // Redirect to the default page
    router.replace(`/site/${subdomain}/${siteData.defaultPage.slug}`);
  }, [siteData, subdomain, router]);

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
