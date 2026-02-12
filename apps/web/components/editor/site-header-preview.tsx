"use client";

import { SearchBox } from "@/components/elements/sections/search/search-box";
import { ModeToggle } from "@/components/mode-toggle";
import { Badge } from "@/components/ui/badge";
import type { Id } from "@repo/backend";

interface SiteHeaderPreviewProps {
  site: {
    _id: Id<"sites">;
    name: string;
    logoUrl?: string;
    settings: {
      showHeader?: boolean;
      showLogo?: boolean;
      showSiteName?: boolean;
      showHeaderSearch?: boolean;
    };
  };
  company: {
    name: string;
    logoUrl?: string;
    settings: { primaryColor?: string };
  };
}

export function SiteHeaderPreview({ site, company }: SiteHeaderPreviewProps) {
  // Settings with defaults
  const showHeader = site.settings.showHeader !== false;
  const showLogo = site.settings.showLogo !== false;
  const showSiteName = site.settings.showSiteName !== false;
  const showHeaderSearch = site.settings.showHeaderSearch === true;

  // Don't render if header is disabled
  if (!showHeader) {
    return null;
  }

  return (
    <div className="relative mb-6 z-10">
      {/* Preview label */}
      <Badge
        variant="secondary"
        className="absolute -top-2 left-4 z-10 text-[10px] px-1.5 py-0"
      >
        Header Preview
      </Badge>

      {/* Header preview - mirrors public-site-layout.tsx header */}
      <header className="border rounded-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          {/* Left side: Logo and site name */}
          <div className="flex items-center gap-2">
            {showLogo && <SiteLogo site={site} company={company} />}
            {showSiteName && (
              <span className="font-semibold">{site.name}</span>
            )}
          </div>

          {/* Right side: Search and mode toggle */}
          <div className="flex items-center gap-3 ml-auto">
            {showHeaderSearch && (
              <SearchBox
                siteId={site._id}
                usePublicQuery={false}
                placeholder="Search..."
                maxResults={5}
                className="w-64"
              />
            )}
            <ModeToggle />
          </div>
        </div>
      </header>
    </div>
  );
}

/**
 * Site logo component with fallback logic (mirrors public-site-layout.tsx)
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
