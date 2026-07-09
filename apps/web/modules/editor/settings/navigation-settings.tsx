"use client";

import { useSite } from "@/lib/data";
import { CollapsibleSettingsSection } from "@/modules/editor/settings/settings-panel";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type { NavigationStyle } from "@baseblocks/domain/site-settings";
import { cn } from "@baseblocks/ui/lib/utils";
import { useMutation } from "convex/react";
import { Check, LayoutList, Loader2, Menu, PanelLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

interface NavigationConfigPanelProps {
  siteId: Id<"sites">;
}

const NAV_STYLE_ICONS: Record<NavigationStyle, LucideIcon> = {
  sidebar: PanelLeft,
  topnav: Menu,
  subnav: LayoutList,
};

const NAVIGATION_STYLES: Array<{
  style: NavigationStyle;
  label: string;
}> = [
  { style: "sidebar", label: "Sidebar" },
  { style: "topnav", label: "Top Nav" },
  { style: "subnav", label: "Tab Bar" },
];

function NavigationStyleCard({
  icon: Icon,
  isSelected,
  label,
  onClick,
}: {
  icon: LucideIcon;
  isSelected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isSelected}
      className={cn(
        "relative flex min-h-[7.5rem] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card text-sm font-medium shadow-sm transition-all",
        !isSelected && "hover:border-border hover:shadow-md",
      )}
      onClick={onClick}
    >
      <Icon className="h-8 w-8 text-muted-foreground/80" />
      <span>{label}</span>
      {isSelected ? (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow-sm">
          <Check className="h-3 w-3 text-primary-foreground" />
        </span>
      ) : null}
    </button>
  );
}

export function NavigationConfigPanel({ siteId }: NavigationConfigPanelProps) {
  const site = useSite(siteId);
  const updateSite = useMutation(api.sites.mutations.update);

  const updateNavigationStyle = async (style: NavigationStyle) => {
    if (!site) return;
    try {
      await updateSite({
        siteId,
        settings: {
          navigationStyle: style,
        },
      });
      toast.success("Navigation style updated");
    } catch (_error) {
      toast.error("Failed to update navigation style");
    }
  };

  if (!site) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentNavStyle = (site.settings.navigationStyle ||
    "sidebar") as NavigationStyle;

  return (
    <div className="space-y-5 p-4">
      <h3 className="text-sm font-semibold tracking-tight">Navigation</h3>

      <CollapsibleSettingsSection title="Layout" contentVariant="stack">
        {NAVIGATION_STYLES.map((styleInfo) => {
          const Icon = NAV_STYLE_ICONS[styleInfo.style];
          const isSelected = currentNavStyle === styleInfo.style;

          return (
            <NavigationStyleCard
              key={styleInfo.style}
              icon={Icon}
              isSelected={isSelected}
              label={styleInfo.label}
              onClick={() => updateNavigationStyle(styleInfo.style)}
            />
          );
        })}
      </CollapsibleSettingsSection>
    </div>
  );
}
