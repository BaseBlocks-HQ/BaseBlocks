"use client";

import { api, type Id } from "@baseblocks/backend";
import {
  DEFAULT_CUSTOM_BRAND_COLOR,
  DEFAULT_SITE_SIDEBAR_VARIANT,
  getSiteThemePreviewColors,
  normalizeBrandColor,
  resolveSiteTheme,
  type SiteThemePaletteId,
  type SiteSidebarVariant,
  type SiteThemeSettings,
  type SiteThemeStyleId,
} from "@baseblocks/domain";
import { Label } from "@baseblocks/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { useMutation } from "convex/react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { CustomBrandColor } from "./custom-brand-color";
import { SiteSettingsSectionTitle } from "./site-settings-section-title";

const PALETTE_OPTIONS: Array<{
  id: Exclude<SiteThemePaletteId, "custom">;
  label: string;
}> = [
  { id: "neutral", label: "Neutral" },
  { id: "amber", label: "Amber" },
  { id: "blue", label: "Blue" },
  { id: "green", label: "Green" },
  { id: "violet", label: "Violet" },
  { id: "rose", label: "Rose" },
];

const STYLE_OPTIONS: Array<{ id: SiteThemeStyleId; label: string }> = [
  { id: "subtle", label: "Subtle" },
  { id: "tinted", label: "Tinted" },
  { id: "vibrant", label: "Vibrant" },
];

const SIDEBAR_VARIANT_OPTIONS: Array<{
  id: SiteSidebarVariant;
  label: string;
}> = [
  { id: "sidebar", label: "Standard" },
  { id: "floating", label: "Floating" },
  { id: "inset", label: "Inset" },
];

const ALL_PALETTE_OPTIONS: Array<{
  id: SiteThemePaletteId;
  label: string;
}> = [...PALETTE_OPTIONS, { id: "custom", label: "Custom" }];

export function SiteAppearanceSettings({
  siteId,
  sidebarVariant,
  theme,
}: {
  siteId: Id<"sites">;
  sidebarVariant?: SiteSidebarVariant;
  theme?: SiteThemeSettings;
}) {
  const updateSite = useMutation(api.sites.update);
  const resolvedTheme = resolveSiteTheme(theme);
  const [customColor, setCustomColor] = useState(
    resolvedTheme.brandColor ?? DEFAULT_CUSTOM_BRAND_COLOR,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const paletteInputId = useId();
  const styleInputId = useId();
  const sidebarInputId = useId();
  const customColorInputId = useId();

  const saveAppearance = async (
    settings:
      | { theme: SiteThemeSettings }
      | { sidebarVariant: SiteSidebarVariant },
    errorMessage = "Unable to update the site appearance. Try again.",
  ) => {
    if (isSaving) return false;
    setIsSaving(true);
    try {
      await updateSite({ siteId, settings });
      return true;
    } catch {
      toast.error(errorMessage);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const saveTheme = (nextTheme: SiteThemeSettings) =>
    saveAppearance({ theme: nextTheme });

  const selectPalette = (palette: SiteThemePaletteId) => {
    if (palette === resolvedTheme.palette) return;
    const normalizedCustomColor =
      normalizeBrandColor(customColor) ?? DEFAULT_CUSTOM_BRAND_COLOR;
    void saveTheme({
      ...resolvedTheme,
      palette,
      brandColor: resolvedTheme.brandColor ?? normalizedCustomColor,
    });
  };

  const applyCustomColor = async () => {
    const brandColor = normalizeBrandColor(customColor);
    if (!brandColor) return;
    setCustomColor(brandColor);
    const didSave = await saveTheme({
      ...resolvedTheme,
      palette: "custom",
      brandColor,
    });
    if (didSave) setIsColorPickerOpen(false);
  };

  const selectedPaletteLabel =
    ALL_PALETTE_OPTIONS.find((option) => option.id === resolvedTheme.palette)
      ?.label ?? "Neutral";
  const selectedStyleLabel =
    STYLE_OPTIONS.find((option) => option.id === resolvedTheme.style)?.label ??
    "Subtle";
  const resolvedSidebarVariant = sidebarVariant ?? DEFAULT_SITE_SIDEBAR_VARIANT;
  const selectedSidebarVariantLabel =
    SIDEBAR_VARIANT_OPTIONS.find(
      (option) => option.id === resolvedSidebarVariant,
    )?.label ?? "Standard";

  return (
    <div className="space-y-10" aria-busy={isSaving}>
      <section className="space-y-4">
        <SiteSettingsSectionTitle>Theme</SiteSettingsSectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={paletteInputId}>Brand color</Label>
            <Select
              disabled={isSaving}
              onValueChange={(value) =>
                selectPalette(value as SiteThemePaletteId)
              }
              value={resolvedTheme.palette}
            >
              <SelectTrigger id={paletteInputId} className="w-full">
                <SelectValue>
                  <PaletteIndicator
                    brandColor={customColor}
                    palette={resolvedTheme.palette}
                    style={resolvedTheme.style}
                  />
                  {selectedPaletteLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                {ALL_PALETTE_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    <PaletteIndicator
                      brandColor={customColor}
                      palette={option.id}
                      style={resolvedTheme.style}
                    />
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={styleInputId}>Theme style</Label>
            <Select
              disabled={isSaving}
              onValueChange={(value) =>
                void saveTheme({
                  ...resolvedTheme,
                  style: value as SiteThemeStyleId,
                })
              }
              value={resolvedTheme.style}
            >
              <SelectTrigger id={styleInputId} className="w-full">
                <SelectValue>{selectedStyleLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                {STYLE_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {resolvedTheme.palette === "custom" ? (
            <CustomBrandColor
              color={customColor}
              disabled={isSaving}
              inputId={customColorInputId}
              onApply={() => void applyCustomColor()}
              onColorChange={setCustomColor}
              onOpenChange={(open) => {
                setCustomColor(
                  resolvedTheme.brandColor ?? DEFAULT_CUSTOM_BRAND_COLOR,
                );
                setIsColorPickerOpen(open);
              }}
              open={isColorPickerOpen}
            />
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <SiteSettingsSectionTitle>Layout</SiteSettingsSectionTitle>
        <div className="space-y-2">
          <Label htmlFor={sidebarInputId}>Sidebar style</Label>
          <Select
            disabled={isSaving}
            onValueChange={(value) =>
              void saveAppearance(
                { sidebarVariant: value as SiteSidebarVariant },
                "Unable to update the sidebar style. Try again.",
              )
            }
            value={resolvedSidebarVariant}
          >
            <SelectTrigger id={sidebarInputId} className="w-full">
              <SelectValue>{selectedSidebarVariantLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              {SIDEBAR_VARIANT_OPTIONS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>
      <span className="sr-only" role="status">
        {isSaving ? "Saving appearance" : ""}
      </span>
    </div>
  );
}

function PaletteIndicator({
  brandColor,
  palette,
  style,
}: {
  brandColor?: string;
  palette: SiteThemePaletteId;
  style: SiteThemeStyleId;
}) {
  const colors = getSiteThemePreviewColors({
    palette,
    style,
    ...(palette === "custom" ? { brandColor } : {}),
  });

  return (
    <span
      aria-hidden
      className="size-3.5 shrink-0 rounded-full border border-black/10 shadow-xs dark:border-white/15"
      style={{ backgroundColor: colors.primary }}
    />
  );
}
