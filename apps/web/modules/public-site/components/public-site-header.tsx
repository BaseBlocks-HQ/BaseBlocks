"use client";

import { ModeToggle } from "@/modules/app-chrome/mode-toggle";
import { SiteLogo } from "@/modules/public-site/components/site-logo";
import { cn } from "@/lib/utils";
import { SearchBox } from "@/modules/editor/elements/sections/search/search-box";
import { TopNavMenu } from "@/modules/public-site/navigation";
import type { Id } from "@baseblocks/backend";
import type { PageWithChildren } from "@baseblocks/domain";
import type { SiteCustomization } from "@baseblocks/domain/elements/customization";
import type { NavigationStyle } from "@baseblocks/domain/elements/navigation";
import { SidebarTrigger, useSidebar } from "@baseblocks/ui/sidebar";

interface PublicSiteHeaderProps {
  site: {
    _id: Id<"sites">;
    name: string;
    logoUrl?: string;
    settings: {
      navigationStyle: NavigationStyle;
      showLogo?: boolean;
      showSiteName?: boolean;
      showHeaderSearch?: boolean;
      customization?: SiteCustomization;
    };
  };
  team: {
    name: string;
    logoUrl?: string;
    settings: { primaryColor?: string };
  };
  pages?: PageWithChildren[];
  currentPath: string;
}

export function PublicSiteHeader({
  site,
  team,
  pages,
  currentPath,
}: PublicSiteHeaderProps) {
  const showSidebar = site.settings.navigationStyle === "sidebar";
  const showTopNav = site.settings.navigationStyle === "topnav";
  const showLogo = site.settings.showLogo !== false;
  const showSiteName = site.settings.showSiteName !== false;
  const showHeaderSearch = site.settings.showHeaderSearch === true;
  const hasCustomHeaderColor = !!site.settings.customization?.headerColor;

  return (
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
        {showSidebar ? (
          <CollapsedSidebarTrigger
            triggerClassName={
              hasCustomHeaderColor
                ? "text-current hover:bg-current/10"
                : undefined
            }
          />
        ) : (
          <div className="flex items-center gap-2">
            {showLogo && <SiteLogo site={site} team={team} />}
            {showSiteName && <span className="font-semibold">{site.name}</span>}
          </div>
        )}

        {showTopNav && pages && (
          <div className="flex-1 flex justify-center ml-8">
            <TopNavMenu pages={pages} currentPath={currentPath} />
          </div>
        )}

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
  );
}

export function GradientStripe({
  customization,
}: {
  customization: SiteCustomization;
}) {
  const primaryColor = customization.accentColor || "#0066FF";
  const gradientStops = [primaryColor];

  if (customization.tertiaryColor) {
    gradientStops.push(customization.tertiaryColor);
  }

  if (customization.secondaryColor) {
    gradientStops.push(customization.secondaryColor);
  }

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

function CollapsedSidebarTrigger({
  triggerClassName,
}: {
  triggerClassName?: string;
}) {
  const { open } = useSidebar();

  if (open) {
    return null;
  }

  return <SidebarTrigger className={triggerClassName} />;
}
