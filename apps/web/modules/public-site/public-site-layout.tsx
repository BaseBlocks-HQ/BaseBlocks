"use client";

import { getPageLink } from "@/lib/url";
import { useCustomizationStyles } from "@/modules/elements/panels/customization/use-site-customization";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type { PageWithChildren } from "@baseblocks/types";
import type { BannerContent } from "@baseblocks/types/elements";
import type { SiteCustomization } from "@baseblocks/types/elements/customization";
import type { NavigationStyle } from "@baseblocks/types/elements/navigation";
import { SidebarProvider } from "@baseblocks/ui/sidebar";
import { useQuery } from "convex/react";
import { redirect } from "next/navigation";
import { useEffect } from "react";
import {
  GradientStripe,
  PublicSiteHeader,
} from "./components/public-site-header";
import { PublicSiteMainContent } from "./components/public-site-main-content";
import { PublicSiteSidebar } from "./components/public-site-sidebar";
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
  const pages = pagesRaw as PageWithChildren[] | undefined;

  const currentPage = useQuery(api.pages.queries.getByPathPublished, {
    siteId: site._id,
    path: pagePath,
  });

  const ancestors = useQuery(
    api.pages.queries.getAncestors,
    currentPage?._id ? { pageId: currentPage._id as Id<"pages"> } : "skip",
  );

  const ancestorIds = ancestors?.map((a) => a._id) ?? [];
  const currentPathString =
    pagePath.length > 0 ? pagePath.join("/") : (currentPage?.slug ?? "");

  if (currentPage === null && pages && pages.length > 0) {
    const firstPage = pages[0];
    if (firstPage) {
      redirect(getPageLink(site.slug, firstPage.slug));
    }
  }

  const siteWideBanners = useQuery(api.banners.queries.getSiteWideBanners, {
    siteId: site._id,
  });

  const pageSpecificBanners = useQuery(
    api.banners.queries.getBannersForPage,
    currentPage?._id
      ? { siteId: site._id, pageId: currentPage._id as Id<"pages"> }
      : "skip",
  );

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

  const showHeader = site.settings.showHeader !== false;
  const sidebarDefaultExpanded = site.settings.sidebarDefaultExpanded === true;
  const navigationStyle = site.settings.navigationStyle;
  const showBreadcrumbs =
    site.settings.showBreadcrumbs ?? navigationStyle !== "sidebar";

  const customizationStyles = useCustomizationStyles(
    site.settings.customization,
  );
  const isCustomized = !!(
    site.settings.customization?.accentColor ||
    site.settings.customization?.headerColor ||
    site.settings.customization?.secondaryColor ||
    site.settings.customization?.borderRadius
  );

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

  const showSidebar = navigationStyle === "sidebar";

  const mainContent = (
    <>
      {showHeader && (
        <PublicSiteHeader
          site={site}
          team={team}
          pages={pages}
          currentPath={currentPathString}
        />
      )}

      {!showSidebar &&
        site.settings.customization?.showHeaderGradient &&
        showHeader && (
          <div className="relative z-30">
            <GradientStripe customization={site.settings.customization} />
          </div>
        )}

      <PublicSiteMainContent
        currentPage={
          currentPage
            ? {
                _id: currentPage._id as string,
                title: currentPage.title,
              }
            : currentPage
        }
        pages={pages}
        banners={allBanners.map((banner) => ({
          id: banner.id,
          content: banner.content as BannerContent,
        }))}
        currentPath={currentPathString}
        navigationStyle={navigationStyle}
        showBreadcrumbs={showBreadcrumbs}
      />
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
              <PublicSiteSidebar
                site={site}
                team={team}
                pages={pages}
                currentPath={currentPathString}
                ancestorIds={ancestorIds}
                sidebarDefaultExpanded={sidebarDefaultExpanded}
              />

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
