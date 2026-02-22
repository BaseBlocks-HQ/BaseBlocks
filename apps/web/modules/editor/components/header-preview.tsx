"use client";

import { ModeToggle } from "@/components/mode-toggle";
import { SiteLogo } from "@/components/site-logo";
import { cn } from "@/lib/utils";
import { useCustomizationStyles } from "@/modules/elements/panels/customization/use-site-customization";
import { SearchBox } from "@/modules/elements/sections/search/search-box";
import type { Id } from "@baseblocks/backend";
import type { SiteCustomization } from "@baseblocks/types/elements/customization";
import { Button } from "@baseblocks/ui/button";
import { PanelTop } from "lucide-react";

interface HeaderPreviewProps {
  site: {
    _id: Id<"sites">;
    name: string;
    logoUrl?: string;
    settings: {
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
  onExit: () => void;
}

export function HeaderPreview({ site, team, onExit }: HeaderPreviewProps) {
  const showLogo = site.settings.showLogo !== false;
  const showSiteName = site.settings.showSiteName !== false;
  const showHeaderSearch = site.settings.showHeaderSearch === true;
  const headerColor = site.settings.customization?.headerColor;
  const customizationStyles = useCustomizationStyles(
    site.settings.customization,
  );

  return (
    <header
      className={cn(
        "border-b h-14 shrink-0 flex items-center px-4 z-40",
        !headerColor &&
          "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      )}
      style={
        headerColor
          ? {
              ...customizationStyles,
              backgroundColor: "var(--site-header-bg)",
              color: "var(--site-header-fg)",
            }
          : customizationStyles
      }
      {...(headerColor ? { "data-site-customized": "" } : {})}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onExit}
        className={cn(
          "mr-3 gap-1.5",
          headerColor && "text-current hover:bg-current/10",
        )}
      >
        <PanelTop className="h-4 w-4" />
        Exit Preview
      </Button>

      <div
        className={cn(
          "h-5 w-px mr-3",
          headerColor ? "bg-current/20" : "bg-border",
        )}
      />

      <div className="flex items-center gap-2">
        {showLogo && <SiteLogo site={site} team={team} />}
        {showSiteName && <span className="font-semibold">{site.name}</span>}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {showHeaderSearch && (
          <SearchBox
            siteId={site._id}
            usePublicQuery={false}
            placeholder="Search..."
            maxResults={5}
            className="w-64"
            headerMode={!!headerColor}
          />
        )}
        <ModeToggle
          className={
            headerColor ? "text-current hover:bg-current/10" : undefined
          }
        />
      </div>
    </header>
  );
}
