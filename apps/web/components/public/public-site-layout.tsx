"use client";

import { SearchBox } from "@/components/elements/sections/search/search-box";
import { ModeToggle } from "@/components/mode-toggle";
import {
  BreadcrumbBar,
  NavItem,
  SubNavBar,
  TopNavMenu,
} from "@/components/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomizationStyles } from "@/hooks";
import { cn } from "@/lib/utils";
import type { PageWithChildren } from "@/types";
import type { SiteCustomization } from "@/types/elements/customization";
import type { NavigationStyle } from "@/types/elements/navigation";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import { PublicContent } from "./public-content";
import { PublicSiteProvider } from "./public-site-context";
import { PublicSubpageProvider } from "./public-subpage-context";

interface PublicSiteLayoutProps {
  site: {
    _id: Id<"sites">;
    name: string;
    slug: string;
    logoUrl?: string;
    settings: {
      navigationStyle: NavigationStyle;
      headerType: string;
      showHeader?: boolean;
      showLogo?: boolean;
      showSiteName?: boolean;
      showHeaderSearch?: boolean;
      customization?: SiteCustomization;
    };
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
    currentPage?._id ? { pageId: currentPage._id as Id<"pages"> } : "skip"
  );

  // Extract ancestor IDs for auto-expanding navigation
  const ancestorIds = ancestors?.map((a) => a._id) ?? [];

  // Build the current path string for navigation matching
  const currentPathString = pagePath.join("/");

  // Settings with defaults
  const showHeader = site.settings.showHeader !== false;
  const showLogo = site.settings.showLogo !== false;
  const showSiteName = site.settings.showSiteName !== false;
  const showHeaderSearch = site.settings.showHeaderSearch === true;
  const navigationStyle = site.settings.navigationStyle;

  // Get customization CSS variables
  const customizationStyles = useCustomizationStyles(site.settings.customization);
  const isCustomized = !!(site.settings.customization?.accentColor || site.settings.customization?.borderRadius);

  // Apply CSS variables to document root so portals (dropdowns, popovers) also inherit them
  useEffect(() => {
    const root = document.documentElement;
    if (isCustomized) {
      root.setAttribute("data-site-customized", "");
      for (const [key, value] of Object.entries(customizationStyles)) {
        if (key.startsWith("--")) {
          root.style.setProperty(key, value as string);
        }
      }
    }
    return () => {
      root.removeAttribute("data-site-customized");
      for (const key of Object.keys(customizationStyles)) {
        if (key.startsWith("--")) {
          root.style.removeProperty(key);
        }
      }
    };
  }, [customizationStyles, isCustomized]);

  // Determine if we should show sidebar
  const showSidebar = navigationStyle === "sidebar";

  // Determine if we should show navigation in header (topnav)
  const showTopNav = navigationStyle === "topnav";

  // Determine if we should show secondary nav bar (subnav)
  const showSubNav = navigationStyle === "subnav";

  return (
    <PublicSiteProvider siteId={site._id} companySlug={company.slug}>
      <PublicSubpageProvider>
      <div
        className="h-screen bg-background flex flex-col overflow-hidden"
        style={customizationStyles}
        {...(isCustomized ? { "data-site-customized": "" } : {})}
      >
        {/* Main Header */}
        {showHeader && (
          <header className="border-b sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-14 items-center px-4">
              {/* Left side: Logo and site name */}
              <div className="flex items-center gap-2">
                {showLogo && <SiteLogo site={site} company={company} />}
                {showSiteName && (
                  <span className="font-semibold">{site.name}</span>
                )}
              </div>

              {/* Center: TopNav navigation (if topnav style) */}
              {showTopNav && pages && (
                <div className="flex-1 flex justify-center ml-8">
                  <TopNavMenu
                    pages={pages}
                    currentPath={currentPathString}
                  />
                </div>
              )}

              {/* Right side: Search and mode toggle */}
              <div className="flex items-center gap-3 ml-auto">
                {showHeaderSearch && (
                  <SearchBox
                    siteId={site._id}
                    usePublicQuery
                    placeholder="Search..."
                    maxResults={5}
                    className="w-64"
                  />
                )}
                <ModeToggle />
              </div>
            </div>
          </header>
        )}

        {/* Secondary Navigation Bar (subnav style) */}
        {showSubNav && pages && (
          <SubNavBar
            pages={pages}
            currentPath={currentPathString}
            className="sticky top-14 z-30"
          />
        )}

        {/* Breadcrumb Bar - positioned below header/subnav */}
        {currentPage && (
          <BreadcrumbBar
            pageId={currentPage._id}
            pageTitle={currentPage.title}
            className={cn(
              "sticky z-20",
              showSubNav ? "top-24" : "top-14"
            )}
          />
        )}

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar navigation */}
          {showSidebar && (
            <aside className="w-64 border-r min-h-[calc(100vh-56px)] p-4 sticky top-14 self-start">
              <nav className="space-y-1">
                {pages === undefined ? (
                  <>
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </>
                ) : (
                  pages.map((page: PageWithChildren) => (
                    <NavItem
                      key={page._id}
                      page={page}
                      currentPath={currentPathString}
                      mode="public"
                      ancestorIds={ancestorIds}
                    />
                  ))
                )}
              </nav>
            </aside>
          )}

          {/* Page content */}
          <main className="flex-1 flex flex-col min-h-0 overflow-auto">
            {currentPage === undefined ? (
              <div className="max-w-3xl mx-auto p-8">
                <Skeleton className="h-10 w-64 mb-8" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : currentPage === null ? (
              <div className="max-w-3xl mx-auto text-center py-12 p-8">
                <p className="text-muted-foreground">Page not found</p>
              </div>
            ) : (
              <PublicContent pageId={currentPage._id} />
            )}

            {/* Footer - inside scrollable area */}
            <footer className="border-t mt-auto flex-shrink-0">
              <div className="container mx-auto flex h-12 items-center justify-center px-4 text-sm text-muted-foreground">
                Powered by BaseBlocks
              </div>
            </footer>
          </main>
        </div>
      </div>
      </PublicSubpageProvider>
    </PublicSiteProvider>
  );
}

/**
 * Site logo component with fallback logic
 */
function SiteLogo({
  site,
  company,
}: {
  site: { name: string; logoUrl?: string };
  company: { name: string; logoUrl?: string; settings: { primaryColor?: string } };
}) {
  // Priority: site logo > company logo > auto-generated
  if (site.logoUrl) {
    return (
      <img
        src={site.logoUrl}
        alt={site.name}
        className="h-8 w-8 rounded-lg object-contain"
      />
    );
  }

  if (company.logoUrl) {
    return (
      <img
        src={company.logoUrl}
        alt={company.name}
        className="h-8 w-8 rounded-lg object-contain"
      />
    );
  }

  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-lg text-white font-bold"
      style={{
        backgroundColor: company.settings.primaryColor || "#0066FF",
      }}
    >
      {site.name[0]}
    </div>
  );
}
