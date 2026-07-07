"use client";

import { ContentSkeleton } from "@/modules/marketing/public-site/components/content-skeleton";
import { cn } from "@/lib/utils";
import { SubNavBar } from "@/modules/marketing/public-site/navigation";
import { BreadcrumbBar } from "@/modules/marketing/public-site/navigation";
import type { Id } from "@baseblocks/backend";
import type { PageWithChildren } from "@baseblocks/types";
import type { NavigationStyle } from "@baseblocks/types/elements/navigation";
import { Button } from "@baseblocks/ui/button";
import Link from "next/link";
import { PublicContent } from "../public-content";

interface CurrentPage {
  _id: string;
  title: string;
}

interface PublicSiteMainContentProps {
  currentPage: CurrentPage | null | undefined;
  currentPageStatus?: "accessible" | "forbidden" | "missing";
  pages?: PageWithChildren[];
  currentPath: string;
  navigationStyle: NavigationStyle;
  showBreadcrumbs: boolean;
}

export function PublicSiteMainContent({
  currentPage,
  currentPageStatus,
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

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {currentPage === undefined ? (
          <div className="p-8">
            <ContentSkeleton />
          </div>
        ) : currentPage === null ? (
          <div className="flex flex-1 items-center justify-center p-8">
            {currentPageStatus === "forbidden" ? (
              <div className="mx-auto max-w-md space-y-4 text-center">
                <h2 className="text-2xl font-semibold tracking-tight">
                  This page is restricted
                </h2>
                <p className="text-muted-foreground">
                  You must have access to view this page.
                </p>
                <Button asChild>
                  <Link href="/login" target="_blank" rel="noreferrer">
                    Log in
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="mx-auto max-w-md text-center">
                <p className="text-muted-foreground">Page not found</p>
              </div>
            )}
          </div>
        ) : (
          <PublicContent pageId={currentPage._id as Id<"pages">} />
        )}
      </div>
    </>
  );
}
