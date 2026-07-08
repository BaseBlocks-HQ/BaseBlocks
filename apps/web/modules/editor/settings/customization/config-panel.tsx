"use client";

import { useSite } from "@/lib/data";
import {
  CollapsibleSettingsSection,
  PanelSettingRow,
} from "@/modules/editor/settings/shared/editor-panel-primitives";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type {
  BorderRadiusPreset,
  SiteCustomization,
} from "@baseblocks/domain/elements/customization";
import { getDarkColorForPreset } from "./presets";
import { Switch } from "@baseblocks/ui/switch";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
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

  const customization = site?.settings?.customization as
    | SiteCustomization
    | undefined;

  const saveCustomization = async (newCustomization: SiteCustomization) => {
    if (!site) return;

    const newCopy = structuredClone(newCustomization);

    setIsSaving(true);
    try {
      await updateSite({
        siteId,
        settings: {
          customization: newCopy,
        },
      });

      setIsSaving(false);
    } catch (_error) {
      toast.error("Failed to update customization");
      setIsSaving(false);
    }
  };

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
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">Customization</h3>
        {isSaving && (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        )}
      </div>

      <CollapsibleSettingsSection
        title="Preview"
        contentClassName="pt-2"
        contentVariant="plain"
      >
        <CustomizationPreview customization={customization} />
      </CollapsibleSettingsSection>

      <CollapsibleSettingsSection title="Colors" contentClassName="p-3">
        <div className="space-y-4">
          <AccentColorPicker
            value={customization?.accentColor}
            onChange={handleColorChange("accentColor")}
            label="Primary Color"
            description="Buttons, links, and focus states across the public site."
          />

          <AccentColorPicker
            value={customization?.headerColor}
            onChange={handleColorChange("headerColor")}
            label="Header Color"
            description="Background of the site header and navigation bar."
          />

          <AccentColorPicker
            value={customization?.secondaryColor}
            onChange={handleColorChange("secondaryColor")}
            label="Secondary Color"
            description="Used for gradient accents and supporting UI highlights."
          />

          <AccentColorPicker
            value={customization?.tertiaryColor}
            onChange={handleColorChange("tertiaryColor")}
            label="Tertiary Color"
            description="Middle tone when a three-color header gradient is shown."
          />
        </div>
      </CollapsibleSettingsSection>

      <CollapsibleSettingsSection
        title="Shape and Effects"
        contentClassName="p-3"
      >
        <div className="space-y-4">
          <PanelSettingRow
            htmlFor="header-gradient"
            label="Header Gradient"
            tooltip="Adds a subtle gradient stripe along the header for extra depth."
            control={
              <Switch
                id="header-gradient"
                checked={customization?.showHeaderGradient ?? false}
                onCheckedChange={handleGradientToggle}
              />
            }
          />

          <BorderRadiusPicker
            value={customization?.borderRadius}
            onChange={handleBorderRadiusChange}
          />
        </div>
      </CollapsibleSettingsSection>
    </div>
  );
}
