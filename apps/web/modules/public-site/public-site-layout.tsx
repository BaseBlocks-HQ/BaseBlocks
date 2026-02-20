"use client";

import { ModeToggle } from "@/components/mode-toggle";
import { SiteLogo } from "@/components/site-logo";
import { ContentSkeleton } from "@/components/skeletons";
import { useCustomizationStyles } from "@/hooks/use-site-customization";
import { getPageLink } from "@/lib/url";
import { cn } from "@/lib/utils";
import { BannerRenderer } from "@/modules/elements/blocks/banner/renderer";
import { SearchBox } from "@/modules/elements/sections/search/search-box";
import {
  BreadcrumbBar,
  NavItem,
  SubNavBar,
  TopNavMenu,
} from "@/modules/navigation";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type { PageWithChildren } from "@baseblocks/types";
import type { BannerContent } from "@baseblocks/types/elements";
import type { SiteCustomization } from "@baseblocks/types/elements/customization";
import type { NavigationStyle } from "@baseblocks/types/elements/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@baseblocks/ui/sidebar";
import { Skeleton } from "@baseblocks/ui/skeleton";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
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
      showBreadcrumbs?: boolean;
      sidebarDefaultExpanded?: boolean;
      customization?: SiteCustomization;
    };
  };
  team: {
    name: string;
    slug: string;
    logoUrl?: string;
    settings: { primaryColor?: string };
  };
  pagePath: string[];
}

export function PublicSiteLayout({
  site,
  team,
  pagePath,
}: PublicSiteLayoutProps) {
  const pagesRaw = useQuery(api.pages.queries.getTreePublished, {
    siteId: site._id,
  });
  // Cast to PageWithChildren - published pages don't need isPublished for navigation
  const pages = pagesRaw as PageWithChildren[] | undefined;

  // Use path-based lookup for nested pages (published version)
  const currentPage = useQuery(api.pages.queries.getByPathPublished, {
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
  // When pagePath is empty (default page), use the resolved page's slug for nav matching
  const currentPathString =
    pagePath.length > 0 ? pagePath.join("/") : (currentPage?.slug ?? "");

  // Redirect to default/first page if current page is not found but pages exist
  const router = useRouter();
  const hasRedirected = useRef(false);
  useEffect(() => {
    if (
      currentPage === null &&
      pages &&
      pages.length > 0 &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      const firstPage = pages[0];
      if (firstPage) {
        router.replace(getPageLink(site.slug, firstPage.slug));
      }
    }
  }, [currentPage, pages, site.slug, router]);

  // Fetch site-wide banners
  const siteWideBanners = useQuery(api.banners.queries.getSiteWideBanners, {
    siteId: site._id,
  });

  // Fetch page-specific banners
  const pageSpecificBanners = useQuery(
    api.banners.queries.getBannersForPage,
    currentPage?._id
      ? { siteId: site._id, pageId: currentPage._id as Id<"pages"> }
      : "skip",
  );

  // Combine banners, deduplicating by block id
  const allBanners = (() => {
    const combined = [
      ...(siteWideBanners ?? []),
      ...(pageSpecificBanners ?? []),
    ];
    const seen = new Set<string>();
    return combined.filter((b) => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
  })();

  // Settings with defaults
  const showHeader = site.settings.showHeader !== false;
  const showLogo = site.settings.showLogo !== false;
  const showSiteName = site.settings.showSiteName !== false;
  const showHeaderSearch = site.settings.showHeaderSearch === true;
  const sidebarDefaultExpanded = site.settings.sidebarDefaultExpanded === true;
  const navigationStyle = site.settings.navigationStyle;
  const showBreadcrumbs =
    site.settings.showBreadcrumbs ?? navigationStyle !== "sidebar";
  const hasCustomHeaderColor = !!site.settings.customization?.headerColor;

  // Get customization CSS variables
  const customizationStyles = useCustomizationStyles(
    site.settings.customization,
  );
  const isCustomized = !!(
    site.settings.customization?.accentColor ||
    site.settings.customization?.headerColor ||
    site.settings.customization?.secondaryColor ||
    site.settings.customization?.borderRadius
  );

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

  const mainContent = (
    <>
      {/* Main Header */}
      {showHeader && (
        <>
          <header
            className={cn(
              "relative shrink-0 z-40",
              !site.settings.customization?.headerColor &&
                "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
            )}
            style={
              site.settings.customization?.headerColor
                ? {
                    backgroundColor: "var(--site-header-bg)",
                    color: "var(--site-header-fg)",
                  }
                : undefined
            }
          >
            <div className="flex h-14 items-center px-4">
              {/* Left side: collapsed sidebar trigger, or logo+name in non-sidebar mode */}
              {showSidebar ? (
                <CollapsedSidebarTrigger />
              ) : (
                <div className="flex items-center gap-2">
                  {showLogo && <SiteLogo site={site} team={team} />}
                  {showSiteName && (
                    <span className="font-semibold">{site.name}</span>
                  )}
                </div>
              )}

              {/* Center: TopNav navigation (if topnav style) */}
              {showTopNav && pages && (
                <div className="flex-1 flex justify-center ml-8">
                  <TopNavMenu pages={pages} currentPath={currentPathString} />
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
                    headerMode={hasCustomHeaderColor}
                  />
                )}
                <ModeToggle
                  className={
                    hasCustomHeaderColor
                      ? "text-current hover:bg-current/10"
                      : undefined
                  }
                />
              </div>
            </div>
          </header>
        </>
      )}

      {/* Gradient stripe below header (non-sidebar mode only, sidebar mode renders it full-width at container level) */}
      {!showSidebar &&
        site.settings.customization?.showHeaderGradient &&
        showHeader && (
          <div className="relative z-30">
            <GradientStripe customization={site.settings.customization} />
          </div>
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
      {showBreadcrumbs && currentPage && (
        <BreadcrumbBar
          pageId={currentPage._id}
          pageTitle={currentPage.title}
          className={cn("sticky z-20", showSubNav ? "top-24" : "top-14")}
        />
      )}

      {/* Site-wide and page-specific banners */}
      {allBanners.length > 0 && (
        <div className="w-full z-10 flex-shrink-0">
          {allBanners.map((banner) => (
            <BannerRenderer
              key={banner.id}
              id={banner.id}
              type="banner"
              content={banner.content as BannerContent}
            />
          ))}
        </div>
      )}

      {/* Page content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-auto">
        {currentPage === undefined ? (
          <div className="p-8">
            <ContentSkeleton />
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
      </div>
    </>
  );

  return (
    <PublicSiteProvider
      siteId={site._id}
      siteSlug={site.slug}
      teamSlug={team.slug}
    >
      <PublicSubpageProvider>
        {showSidebar ? (
          <SidebarProvider>
            {/* Full-width gradient stripe (fixed position so it spans sidebar + main) */}
            {site.settings.customization?.showHeaderGradient && showHeader && (
              <div className="fixed top-14 left-0 right-0 z-30">
                <GradientStripe customization={site.settings.customization} />
              </div>
            )}
            <div
              className="h-screen bg-background flex overflow-hidden w-full"
              style={customizationStyles}
              {...(isCustomized ? { "data-site-customized": "" } : {})}
            >
              <Sidebar className="!border-r-0">
                <SidebarHeader
                  className={cn(
                    "h-14 px-4 flex flex-row items-center gap-2",
                    !site.settings.customization?.headerColor &&
                      "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
                  )}
                  style={
                    site.settings.customization?.headerColor
                      ? {
                          backgroundColor: "var(--site-header-bg)",
                          color: "var(--site-header-fg)",
                        }
                      : undefined
                  }
                >
                  {showLogo && <SiteLogo site={site} team={team} />}
                  {showSiteName && (
                    <span className="font-semibold truncate">{site.name}</span>
                  )}
                  <SidebarTrigger className="ml-auto" />
                </SidebarHeader>
                <SidebarContent className="p-4 border-r border-t">
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
                          defaultExpanded={sidebarDefaultExpanded}
                        />
                      ))
                    )}
                  </nav>
                </SidebarContent>
              </Sidebar>

              <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {mainContent}
              </main>
            </div>
          </SidebarProvider>
        ) : (
          <div
            className="h-screen bg-background flex flex-col overflow-hidden"
            style={customizationStyles}
            {...(isCustomized ? { "data-site-customized": "" } : {})}
          >
            {mainContent}
          </div>
        )}
      </PublicSubpageProvider>
    </PublicSiteProvider>
  );
}

/**
 * Sidebar trigger that only renders when the sidebar is collapsed
 */
function CollapsedSidebarTrigger() {
  const { open } = useSidebar();
  if (open) return null;
  return <SidebarTrigger />;
}

/**
 * Gradient stripe rendered below the header
 */
function GradientStripe({
  customization,
}: { customization: SiteCustomization }) {
  const primaryColor = customization.accentColor || "#0066FF";

  // Gradient order: primary → tertiary → secondary
  const gradientStops = [primaryColor];
  if (customization.tertiaryColor)
    gradientStops.push(customization.tertiaryColor);
  if (customization.secondaryColor)
    gradientStops.push(customization.secondaryColor);
  const gradient =
    gradientStops.length >= 2
      ? `linear-gradient(to right, ${gradientStops.join(", ")})`
      : primaryColor;

  return (
    <div
      className="h-1 w-full flex-shrink-0"
      style={{ background: gradient }}
    />
  );
}
