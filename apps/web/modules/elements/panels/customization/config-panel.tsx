"use client";

import { useSite } from "@/lib/data";
import { useEditorUndoOptional } from "@/modules/shared/contexts/editor-context";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type {
  BorderRadiusPreset,
  SiteCustomization,
} from "@baseblocks/types/elements/customization";
import { getDarkColorForPreset } from "@baseblocks/types/elements/customization";
import { Label } from "@baseblocks/ui/label";
import { Switch } from "@baseblocks/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import { useMutation } from "convex/react";
import { Info, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AccentColorPicker } from "./accent-color-picker";
import { BorderRadiusPicker } from "./border-radius-picker";
import { lightenColor } from "./lib";
import { CustomizationPreview } from "./preview";

interface CustomizationConfigPanelProps {
  siteId: Id<"sites">;
}

export function CustomizationConfigPanel({
  siteId,
}: CustomizationConfigPanelProps) {
  const site = useSite(siteId);
  const updateSite = useMutation(api.sites.mutations.update);
  const [isSaving, setIsSaving] = useState(false);
  const undoContext = useEditorUndoOptional();

  // Get current customization from site settings (may be undefined)
  const customization = site?.settings?.customization as
    | SiteCustomization
    | undefined;

  // Generic save helper
  const saveCustomization = async (newCustomization: SiteCustomization) => {
    if (!site) return;

    const oldCustomization = customization
      ? structuredClone(customization)
      : {};
    const newCopy = structuredClone(newCustomization);
    const shouldTrackUndo = Boolean(
      undoContext && !undoContext.isUndoRedoExecuting,
    );
    const activeUndoContext = shouldTrackUndo ? undoContext : null;

    setIsSaving(true);
    try {
      await updateSite({
        siteId,
        settings: {
          customization: newCopy,
        },
      });

      if (activeUndoContext) {
        activeUndoContext.pushCommand({
          description: "Update customization",
          undo: async () => {
            await updateSite({
              siteId,
              settings: { customization: oldCustomization },
            });
          },
          redo: async () => {
            await updateSite({
              siteId,
              settings: { customization: newCopy },
            });
          },
        });
      }
      setIsSaving(false);
    } catch (_error) {
      toast.error("Failed to update customization");
      setIsSaving(false);
    }
  };

  // Handle color change for a specific field
  const handleColorChange =
    (
      field: "accentColor" | "headerColor" | "secondaryColor" | "tertiaryColor",
    ) =>
    async (color: string | undefined) => {
      if (!site) return;

      const darkField = `${field}Dark` as const;
      const newCustomization = { ...customization };

      if (color) {
        const darkColor =
          getDarkColorForPreset(color) || lightenColor(color, 0.2);
        (newCustomization as Record<string, unknown>)[field] = color;
        (newCustomization as Record<string, unknown>)[darkField] = darkColor;
      } else {
        delete (newCustomization as Record<string, unknown>)[field];
        delete (newCustomization as Record<string, unknown>)[darkField];
      }

      await saveCustomization(newCustomization);
    };

  // Handle border radius change
  const handleBorderRadiusChange = async (
    radius: BorderRadiusPreset | undefined,
  ) => {
    if (!site) return;

    const newCustomization = { ...customization };
    if (radius) {
      newCustomization.borderRadius = radius;
    } else {
      newCustomization.borderRadius = undefined;
    }

    await saveCustomization(newCustomization);
  };

  // Handle gradient toggle
  const handleGradientToggle = async (checked: boolean) => {
    if (!site) return;

    const newCustomization = { ...customization };
    if (checked) {
      newCustomization.showHeaderGradient = true;
    } else {
      newCustomization.showHeaderGradient = undefined;
    }

    await saveCustomization(newCustomization);
  };

  if (!site) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-sm">Customization</h3>
        </div>
        {isSaving && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <CustomizationPreview customization={customization} />

      <AccentColorPicker
        value={customization?.accentColor}
        onChange={handleColorChange("accentColor")}
        label="Primary Color"
        description="Buttons, links, and focus states"
      />

      <AccentColorPicker
        value={customization?.headerColor}
        onChange={handleColorChange("headerColor")}
        label="Header Color"
        description="Header background and navigation bar"
      />

      <AccentColorPicker
        value={customization?.secondaryColor}
        onChange={handleColorChange("secondaryColor")}
        label="Secondary Color"
        description="Gradient end color and decorative elements"
      />

      <AccentColorPicker
        value={customization?.tertiaryColor}
        onChange={handleColorChange("tertiaryColor")}
        label="Tertiary Color"
        description="Middle gradient color"
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Header Gradient</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground/60 cursor-default" />
            </TooltipTrigger>
            <TooltipContent side="top">
              Show a gradient stripe below the header
            </TooltipContent>
          </Tooltip>
        </div>
        <Switch
          checked={customization?.showHeaderGradient ?? false}
          onCheckedChange={handleGradientToggle}
        />
      </div>

      <BorderRadiusPicker
        value={customization?.borderRadius}
        onChange={handleBorderRadiusChange}
      />
    </div>
  );
}
