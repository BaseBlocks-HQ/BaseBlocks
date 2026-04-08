"use client";

import { useSite } from "@/lib/data";
import { ElementCard } from "@/modules/editor/components/element-picker/element-card";
import { themedPickerImagePreview } from "@/modules/elements/framework/themed-picker-image";
import { CollapsibleSettingsSection } from "@/modules/elements/panels/shared/editor-panel-primitives";
import { useEditorUndoOptional } from "@/modules/shared/contexts/editor-context";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import {
  NAVIGATION_STYLES,
  type NavigationStyle,
} from "@baseblocks/types/elements/navigation";
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
  const undoContext = useEditorUndoOptional();

  const updateNavigationStyle = async (style: NavigationStyle) => {
    if (!site) return;
    const oldStyle = (site.settings.navigationStyle ||
      "sidebar") as NavigationStyle;
    const shouldTrackUndo = Boolean(
      undoContext && !undoContext.isUndoRedoExecuting,
    );
    const activeUndoContext = shouldTrackUndo ? undoContext : null;
    try {
      await updateSite({
        siteId,
        settings: {
          navigationStyle: style,
        },
      });
      toast.success("Navigation style updated");

      if (activeUndoContext) {
        activeUndoContext.pushCommand({
          description: "Change navigation style",
          undo: async () => {
            await updateSite({
              siteId,
              settings: { navigationStyle: oldStyle },
            });
          },
          redo: async () => {
            await updateSite({
              siteId,
              settings: { navigationStyle: style },
            });
          },
        });
      }
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
              description={styleInfo.description}
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
