"use client";

import { ContentSkeleton } from "@/components/skeletons";
import { cn } from "@/lib/utils";
import { BannerRenderer } from "@/modules/elements/blocks/banner/renderer";
import { SubNavBar } from "@/modules/navigation";
import { BreadcrumbBar } from "@/modules/navigation";
import type { Id } from "@baseblocks/backend";
import type { PageWithChildren } from "@baseblocks/types";
import type { BannerContent } from "@baseblocks/types/elements";
import type { NavigationStyle } from "@baseblocks/types/elements/navigation";
import { PublicContent } from "../public-content";

interface BannerItem {
  id: string;
  content: BannerContent;
}

interface CurrentPage {
  _id: string;
  title: string;
}

interface PublicSiteMainContentProps {
  currentPage: CurrentPage | null | undefined;
  pages?: PageWithChildren[];
  banners: BannerItem[];
  currentPath: string;
  navigationStyle: NavigationStyle;
  showBreadcrumbs: boolean;
  hasTopHeader: boolean;
}

export function PublicSiteMainContent({
  currentPage,
  pages,
  banners,
  currentPath,
  navigationStyle,
  showBreadcrumbs,
  hasTopHeader,
}: PublicSiteMainContentProps) {
  const showSubNav = navigationStyle === "subnav";
  const subNavTopClass = hasTopHeader ? "top-14" : "top-0";
  const breadcrumbTopClass = showSubNav
    ? hasTopHeader
      ? "top-24"
      : "top-10"
    : hasTopHeader
      ? "top-14"
      : "top-0";

  return (
    <>
      {showSubNav && pages && (
        <SubNavBar
          pages={pages}
          currentPath={currentPath}
          className={cn("sticky z-30", subNavTopClass)}
        />
      )}

      {showBreadcrumbs && currentPage && (
        <BreadcrumbBar
          pageId={currentPage._id as Id<"pages">}
          pageTitle={currentPage.title}
          className={cn("sticky z-20", breadcrumbTopClass)}
        />
      )}

      {banners.length > 0 && (
        <div className="w-full z-10 flex-shrink-0">
          {banners.map((banner) => (
            <BannerRenderer
              key={banner.id}
              id={banner.id}
              type="banner"
              content={banner.content}
            />
          ))}
        </div>
      )}

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
          <PublicContent pageId={currentPage._id as Id<"pages">} />
        )}

        <footer className="border-t mt-auto flex-shrink-0">
          <div className="container mx-auto flex h-12 items-center justify-center px-4 text-sm text-muted-foreground">
            Powered by BaseBlocks
          </div>
        </footer>
      </div>
    </>
  );
}
