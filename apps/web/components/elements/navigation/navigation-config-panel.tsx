"use client";

import { cn } from "@/lib/utils";
import {
  NAVIGATION_STYLES,
  type NavigationStyle,
} from "@/types/elements/navigation";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { useMutation, useQuery } from "convex/react";
import { Check, LayoutList, Loader2, Menu, PanelLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";

interface NavigationConfigPanelProps {
  siteId: Id<"sites">;
}

// Icon mapping for navigation styles
const NAV_STYLE_ICONS: Record<NavigationStyle, LucideIcon> = {
  sidebar: PanelLeft,
  topnav: Menu,
  subnav: LayoutList,
};

// Visual preview components for each navigation style
function SidebarPreview() {
  return (
    <div className="w-full h-full flex rounded overflow-hidden border border-border/50">
      {/* Sidebar */}
      <div className="w-1/4 bg-muted/80 border-r border-border/50 flex flex-col gap-1 p-1">
        <div className="h-1.5 w-full bg-foreground/20 rounded-sm" />
        <div className="h-1 w-3/4 bg-foreground/10 rounded-sm" />
        <div className="h-1 w-3/4 bg-foreground/10 rounded-sm" />
        <div className="h-1 w-3/4 bg-foreground/10 rounded-sm" />
      </div>
      {/* Content */}
      <div className="flex-1 p-1.5 flex flex-col gap-1">
        <div className="h-1.5 w-1/2 bg-foreground/15 rounded-sm" />
        <div className="flex-1 bg-muted/40 rounded-sm" />
      </div>
    </div>
  );
}

function TopNavPreview() {
  return (
    <div className="w-full h-full flex flex-col rounded overflow-hidden border border-border/50">
      {/* Top nav */}
      <div className="h-3 bg-muted/80 border-b border-border/50 flex items-center gap-1 px-1.5">
        <div className="h-1.5 w-1.5 bg-foreground/20 rounded-sm" />
        <div className="flex-1" />
        <div className="h-1 w-3 bg-foreground/10 rounded-sm" />
        <div className="h-1 w-3 bg-foreground/10 rounded-sm" />
        <div className="h-1 w-3 bg-foreground/10 rounded-sm" />
      </div>
      {/* Content */}
      <div className="flex-1 p-1.5 flex flex-col gap-1">
        <div className="h-1.5 w-1/3 bg-foreground/15 rounded-sm" />
        <div className="flex-1 bg-muted/40 rounded-sm" />
      </div>
    </div>
  );
}

function SubNavPreview() {
  return (
    <div className="w-full h-full flex flex-col rounded overflow-hidden border border-border/50">
      {/* Top nav */}
      <div className="h-3 bg-muted/80 border-b border-border/50 flex items-center gap-1 px-1.5">
        <div className="h-1.5 w-1.5 bg-foreground/20 rounded-sm" />
        <div className="flex-1" />
        <div className="h-1 w-3 bg-foreground/10 rounded-sm" />
      </div>
      {/* Sub nav */}
      <div className="h-2.5 bg-muted/50 border-b border-border/50 flex items-center gap-1 px-1.5">
        <div className="h-1 w-4 bg-foreground/15 rounded-sm" />
        <div className="h-1 w-4 bg-foreground/10 rounded-sm" />
        <div className="h-1 w-4 bg-foreground/10 rounded-sm" />
      </div>
      {/* Content */}
      <div className="flex-1 p-1.5 flex flex-col gap-1">
        <div className="h-1.5 w-1/3 bg-foreground/15 rounded-sm" />
        <div className="flex-1 bg-muted/40 rounded-sm" />
      </div>
    </div>
  );
}

const NAV_STYLE_PREVIEWS: Record<NavigationStyle, React.FC> = {
  sidebar: SidebarPreview,
  topnav: TopNavPreview,
  subnav: SubNavPreview,
};

export function NavigationConfigPanel({ siteId }: NavigationConfigPanelProps) {
  const site = useQuery(api.sites.queries.get, { siteId });
  const updateSite = useMutation(api.sites.mutations.update);

  const updateNavigationStyle = useCallback(
    async (style: NavigationStyle) => {
      if (!site) return;
      try {
        await updateSite({
          siteId,
          settings: {
            navigationStyle: style,
          },
        });
        toast.success("Navigation style updated");
      } catch (error) {
        console.error("Failed to update navigation style:", error);
        toast.error("Failed to update navigation style");
      }
    },
    [siteId, site, updateSite]
  );

  if (!site) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentNavStyle = (site.settings.navigationStyle ||
    "sidebar") as NavigationStyle;

  return (
    <div className="p-4">
      <h3 className="font-semibold text-sm mb-3">Navigation</h3>
      <div className="grid grid-cols-2 gap-3">
        {NAVIGATION_STYLES.map((styleInfo) => {
          const Icon = NAV_STYLE_ICONS[styleInfo.style];
          const Preview = NAV_STYLE_PREVIEWS[styleInfo.style];
          const isSelected = currentNavStyle === styleInfo.style;

          return (
            <button
              key={styleInfo.style}
              onClick={() => updateNavigationStyle(styleInfo.style)}
              className={cn(
                "group flex flex-col rounded-lg border bg-card overflow-hidden transition-all cursor-pointer",
                isSelected
                  ? "border-primary shadow-md"
                  : "hover:border-primary/50 hover:shadow-md"
              )}
            >
              <div className="aspect-[4/3] bg-muted/30 border-b flex items-center justify-center p-3 relative">
                <Preview />
                {isSelected && (
                  <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </div>
              <div className="p-2 flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{styleInfo.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
