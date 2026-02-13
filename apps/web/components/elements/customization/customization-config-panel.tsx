"use client";

import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  type BorderRadiusPreset,
  type SiteCustomization,
} from "@/types/elements/customization";
import { getDarkColorForPreset } from "@/types/elements/customization";
import { lightenColor } from "@/lib/customization";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AccentColorPicker } from "./accent-color-picker";
import { BorderRadiusPicker } from "./border-radius-picker";
import { CustomizationPreview } from "./customization-preview";

interface CustomizationConfigPanelProps {
  siteId: Id<"sites">;
}

export function CustomizationConfigPanel({ siteId }: CustomizationConfigPanelProps) {
  const site = useQuery(api.sites.queries.get, { siteId });
  const updateSite = useMutation(api.sites.mutations.update);
  const [isSaving, setIsSaving] = useState(false);

  // Get current customization from site settings (may be undefined)
  const customization = site?.settings?.customization as SiteCustomization | undefined;

  // Generic save helper
  const saveCustomization = useCallback(
    async (newCustomization: SiteCustomization) => {
      if (!site) return;

      setIsSaving(true);
      try {
        await updateSite({
          siteId,
          settings: {
            customization: newCustomization,
          },
        });
      } catch (error) {
        console.error("Failed to update customization:", error);
        toast.error("Failed to update customization");
      } finally {
        setIsSaving(false);
      }
    },
    [siteId, site, updateSite]
  );

  // Handle color change for a specific field
  const handleColorChange = useCallback(
    (field: "accentColor" | "headerColor" | "secondaryColor") =>
      async (color: string | undefined) => {
        if (!site) return;

        const darkField = `${field}Dark` as const;
        const newCustomization = { ...customization };

        if (color) {
          const darkColor = getDarkColorForPreset(color) || lightenColor(color, 0.2);
          (newCustomization as Record<string, unknown>)[field] = color;
          (newCustomization as Record<string, unknown>)[darkField] = darkColor;
        } else {
          delete (newCustomization as Record<string, unknown>)[field];
          delete (newCustomization as Record<string, unknown>)[darkField];
        }

        await saveCustomization(newCustomization);
      },
    [site, customization, saveCustomization]
  );

  // Handle border radius change
  const handleBorderRadiusChange = useCallback(
    async (radius: BorderRadiusPreset | undefined) => {
      if (!site) return;

      const newCustomization = { ...customization };
      if (radius) {
        newCustomization.borderRadius = radius;
      } else {
        delete newCustomization.borderRadius;
      }

      await saveCustomization(newCustomization);
    },
    [site, customization, saveCustomization]
  );

  // Handle gradient toggle
  const handleGradientToggle = useCallback(
    async (checked: boolean) => {
      if (!site) return;

      const newCustomization = { ...customization };
      if (checked) {
        newCustomization.showHeaderGradient = true;
      } else {
        delete newCustomization.showHeaderGradient;
      }

      await saveCustomization(newCustomization);
    },
    [site, customization, saveCustomization]
  );

  if (!site) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-sm mb-1">Customization</h3>
          <p className="text-xs text-muted-foreground">
            Customize your site&apos;s appearance
          </p>
        </div>
        {isSaving && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Live Preview (always visible when any customization is set) */}
      <CustomizationPreview customization={customization} />

      {/* Primary Color */}
      <div className="border-t pt-4">
        <AccentColorPicker
          value={customization?.accentColor}
          onChange={handleColorChange("accentColor")}
          label="Primary Color"
          description="Buttons, links, and focus states"
        />
      </div>

      {/* Header Color */}
      <div className="border-t pt-4">
        <AccentColorPicker
          value={customization?.headerColor}
          onChange={handleColorChange("headerColor")}
          label="Header Color"
          description="Header background and navigation bar"
        />
      </div>

      {/* Accent Color */}
      <div className="border-t pt-4">
        <AccentColorPicker
          value={customization?.secondaryColor}
          onChange={handleColorChange("secondaryColor")}
          label="Accent Color"
          description="Gradient secondary and decorative elements"
        />
      </div>

      {/* Header Gradient Toggle */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Header Gradient</Label>
            <p className="text-xs text-muted-foreground">
              Show a gradient stripe below the header
            </p>
          </div>
          <Switch
            checked={customization?.showHeaderGradient ?? false}
            onCheckedChange={handleGradientToggle}
          />
        </div>
      </div>

      {/* Border Radius */}
      <div className="border-t pt-4">
        <BorderRadiusPicker
          value={customization?.borderRadius}
          onChange={handleBorderRadiusChange}
        />
      </div>
    </div>
  );
}
