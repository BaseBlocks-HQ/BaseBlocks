"use client";

import { SiteLogo } from "@/components/site-logo";
import { cn } from "@/lib/utils";
import { NavItem } from "@/modules/navigation";
import type { PageWithChildren } from "@baseblocks/types";
import type { SiteCustomization } from "@baseblocks/types/elements/customization";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
} from "@baseblocks/ui/sidebar";
import { Skeleton } from "@baseblocks/ui/skeleton";

interface PublicSiteSidebarProps {
  site: {
    name: string;
    logoUrl?: string;
    settings: {
      customization?: SiteCustomization;
      showLogo?: boolean;
      showSiteName?: boolean;
    };
  };
  team: {
    name: string;
    logoUrl?: string;
    settings: { primaryColor?: string };
  };
  pages?: PageWithChildren[];
  currentPath: string;
  ancestorIds: string[];
  sidebarDefaultExpanded: boolean;
}

export function PublicSiteSidebar({
  site,
  team,
  pages,
  currentPath,
  ancestorIds,
  sidebarDefaultExpanded,
}: PublicSiteSidebarProps) {
  const showLogo = site.settings.showLogo !== false;
  const showSiteName = site.settings.showSiteName !== false;

  return (
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
      <SidebarContent className="overflow-hidden border-r border-t p-0">
        <ScrollArea className="h-full">
          <nav className="space-y-1 p-4">
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
                  page={page}
                  currentPath={currentPath}
                  mode="public"
                  ancestorIds={ancestorIds}
                  defaultExpanded={sidebarDefaultExpanded}
                />
              ))
            )}
          </nav>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}
