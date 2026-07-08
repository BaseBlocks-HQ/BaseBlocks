"use client";

import { useSite } from "@/lib/data";
import { ElementCard } from "@/modules/editor/element-picker/element-card";
import { themedPickerImagePreview } from "@/modules/editor/element-picker/picker-image-preview";
import { CollapsibleSettingsSection } from "@/modules/editor/settings/shared/editor-panel-primitives";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type { NavigationStyle } from "@baseblocks/domain/site-settings";
import { useMutation } from "convex/react";
import { LayoutList, Loader2, Menu, PanelLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FC } from "react";
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

const NAV_STYLE_PREVIEWS: Record<
  NavigationStyle,
  FC<{ className?: string }>
> = {
  sidebar: themedPickerImagePreview(
    "/editor/picker/navigation/sidebar-light-v2.png",
    "/editor/picker/navigation/sidebar-dark-v2.png",
  ),
  topnav: themedPickerImagePreview(
    "/editor/picker/navigation/topnav-light-v2.png",
    "/editor/picker/navigation/topnav-dark-v2.png",
  ),
  subnav: themedPickerImagePreview(
    "/editor/picker/navigation/subnav-light-v2.png",
    "/editor/picker/navigation/subnav-dark-v2.png",
  ),
};

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
          const Preview = NAV_STYLE_PREVIEWS[styleInfo.style];
          const isSelected = currentNavStyle === styleInfo.style;

          return (
            <ElementCard
              key={styleInfo.style}
              icon={Icon}
              isSelected={isSelected}
              label={styleInfo.label}
              preview={Preview}
              onClick={() => updateNavigationStyle(styleInfo.style)}
            />
          );
        })}
      </CollapsibleSettingsSection>
    </div>
  );
}
