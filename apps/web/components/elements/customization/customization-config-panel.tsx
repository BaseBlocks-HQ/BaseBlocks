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

  // Handle accent color change (undefined means clear)
  const handleAccentColorChange = useCallback(
    async (color: string | undefined) => {
      if (!site) return;

      setIsSaving(true);
      try {
        let newCustomization: SiteCustomization;

        if (color) {
          // Setting a new color
          const darkColor = getDarkColorForPreset(color) || lightenColor(color, 0.2);
          newCustomization = {
            ...customization,
            accentColor: color,
            accentColorDark: darkColor,
          };
        } else {
          // Clearing the color - create new object without color fields
          newCustomization = {
            borderRadius: customization?.borderRadius,
          };
          // Remove undefined values
          if (!newCustomization.borderRadius) {
            delete newCustomization.borderRadius;
          }
        }

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
    [siteId, site, customization, updateSite]
  );

  // Handle border radius change (undefined means clear)
  const handleBorderRadiusChange = useCallback(
    async (radius: BorderRadiusPreset | undefined) => {
      if (!site) return;

      setIsSaving(true);
      try {
        let newCustomization: SiteCustomization;

        if (radius) {
          // Setting a new radius
          newCustomization = {
            ...customization,
            borderRadius: radius,
          };
        } else {
          // Clearing the radius - create new object without radius field
          newCustomization = {
            accentColor: customization?.accentColor,
            accentColorDark: customization?.accentColorDark,
          };
          // Remove undefined values
          if (!newCustomization.accentColor) {
            delete newCustomization.accentColor;
            delete newCustomization.accentColorDark;
          }
        }

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
    [siteId, site, customization, updateSite]
  );

  if (!site) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Check if any customization is applied
  const hasAnyCustomization = !!(customization?.accentColor || customization?.borderRadius);

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

      {/* Accent Color */}
      <div className="border-t pt-4">
        <AccentColorPicker
          value={customization?.accentColor}
          onChange={handleAccentColorChange}
        />
      </div>

      {/* Border Radius */}
      <div className="border-t pt-4">
        <BorderRadiusPicker
          value={customization?.borderRadius}
          onChange={handleBorderRadiusChange}
        />
      </div>

      {/* Preview - only show if any customization is set */}
      {hasAnyCustomization && (
        <div className="border-t pt-4">
          <CustomizationPreview customization={customization} />
        </div>
      )}
    </div>
  );
}
