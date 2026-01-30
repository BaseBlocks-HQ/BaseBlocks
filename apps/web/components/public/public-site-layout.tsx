"use client";

import { ModeToggle } from "@/components/mode-toggle";
import { NavItem, PageBreadcrumbs } from "@/components/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import type { PageWithChildren } from "@/types";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { useQuery } from "convex/react";
import { PublicContent } from "./public-content";
import { PublicSiteProvider } from "./public-site-context";

interface PublicSiteLayoutProps {
  site: {
    _id: Id<"sites">;
    name: string;
    slug: string;
    logoUrl?: string;
    settings: { navigationStyle: string; headerType: string };
  };
  company: {
    name: string;
    slug: string;
    logoUrl?: string;
    settings: { primaryColor?: string };
  };
  pagePath: string[];
}

export function PublicSiteLayout({
  site,
  company,
  pagePath,
}: PublicSiteLayoutProps) {
  const pages = useQuery(api.pages.queries.getTree, {
    siteId: site._id,
  });

  // Use path-based lookup for nested pages
  const currentPage = useQuery(api.pages.queries.getByPath, {
    siteId: site._id,
    path: pagePath,
  });

  // Get ancestors for breadcrumbs and auto-expanding navigation
  const ancestors = useQuery(
    api.pages.queries.getAncestors,
    currentPage?._id ? { pageId: currentPage._id as Id<"pages"> } : "skip",
  );

  // Extract ancestor IDs for auto-expanding navigation
  const ancestorIds = ancestors?.map((a) => a._id) ?? [];

  // Build the current path string for navigation matching
  const currentPathString = pagePath.join("/");

  return (
    <PublicSiteProvider siteId={site._id} companySlug={company.slug}>
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              {/* Priority: site logo > company logo > auto-generated */}
              {site.logoUrl ? (
                <img
                  src={site.logoUrl}
                  alt={site.name}
                  className="h-8 w-8 rounded-lg object-contain"
                />
              ) : company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="h-8 w-8 rounded-lg object-contain"
                />
              ) : (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white font-bold"
                  style={{
                    backgroundColor: company.settings.primaryColor || "#0066FF",
                  }}
                >
                  {site.name[0]}
                </div>
              )}
              <span className="font-semibold">{site.name}</span>
            </div>
            <ModeToggle />
          </div>
        </header>

        <div className="flex">
          {site.settings.navigationStyle === "sidebar" && (
            <aside className="w-64 border-r min-h-[calc(100vh-56px)] p-4">
              <nav className="space-y-1">
                {pages === undefined ? (
                  <>
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </>
                ) : (
                  pages.map((page) => (
                    <NavItem
                      key={page._id}
                      page={page as PageWithChildren}
                      currentPath={currentPathString}
                      mode="public"
                      ancestorIds={ancestorIds}
                    />
                  ))
                )}
              </nav>
            </aside>
          )}

          <main className="flex-1 p-8">
            {currentPage === undefined ? (
              <div className="max-w-3xl mx-auto">
                <Skeleton className="h-10 w-64 mb-8" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : currentPage === null ? (
              <div className="max-w-3xl mx-auto text-center py-12">
                <p className="text-muted-foreground">Page not found</p>
              </div>
            ) : (
              <>
                {/* Breadcrumb navigation */}
                <PageBreadcrumbs
                  pageId={currentPage._id}
                  pageTitle={currentPage.title}
                />
                <PublicContent pageId={currentPage._id} />
              </>
            )}
          </main>
        </div>

        <footer className="border-t mt-auto">
          <div className="container mx-auto flex h-12 items-center justify-center px-4 text-sm text-muted-foreground">
            Powered by BaseBlocks
          </div>
        </footer>
      </div>
    </PublicSiteProvider>
  );
}
