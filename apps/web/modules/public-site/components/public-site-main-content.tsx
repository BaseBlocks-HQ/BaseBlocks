"use client";

import { ContentSkeleton } from "@/components/skeletons";
import { cn } from "@/lib/utils";
import { SubNavBar } from "@/modules/navigation";
import { BreadcrumbBar } from "@/modules/navigation";
import type { Id } from "@baseblocks/backend";
import type { PageWithChildren } from "@baseblocks/types";
import type { NavigationStyle } from "@baseblocks/types/elements/navigation";
import { PublicContent } from "../public-content";

interface CurrentPage {
  _id: string;
  title: string;
}

interface PublicSiteMainContentProps {
  currentPage: CurrentPage | null | undefined;
  pages?: PageWithChildren[];
  currentPath: string;
  navigationStyle: NavigationStyle;
  showBreadcrumbs: boolean;
}

export function PublicSiteMainContent({
  currentPage,
  pages,
  currentPath,
  navigationStyle,
  showBreadcrumbs,
}: PublicSiteMainContentProps) {
  const showSubNav = navigationStyle === "subnav";

  return (
    <>
      {showSubNav && pages && (
        <SubNavBar
          pages={pages}
          currentPath={currentPath}
          className="sticky top-14 z-30"
        />
      )}

      {showBreadcrumbs && currentPage && (
        <BreadcrumbBar
          pageId={currentPage._id as Id<"pages">}
          pageTitle={currentPage.title}
          className={cn("sticky z-20", showSubNav ? "top-24" : "top-14")}
        />
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
