"use client";

import { api, type Id } from "@baseblocks/backend";
import {
  DEFAULT_CUSTOM_BRAND_COLOR,
  DEFAULT_SITE_SIDEBAR_VARIANT,
  getSiteThemePreviewColors,
  isValidBrandColor,
  normalizeBrandColor,
  resolveSiteTheme,
  type SiteThemePaletteId,
  type SiteSidebarVariant,
  type SiteThemeSettings,
  type SiteThemeStyleId,
} from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import { ColorPicker } from "@baseblocks/ui/color-picker";
import { Label } from "@baseblocks/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@baseblocks/ui/popover";
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
  const customColorInputId = useId();

  const saveTheme = async (nextTheme: SiteThemeSettings) => {
    if (isSaving) return false;
    setIsSaving(true);
    try {
      await updateSite({ siteId, settings: { theme: nextTheme } });
      return true;
    } catch (_error) {
      toast.error("Failed to update site appearance");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

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
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Brand color</p>
        <Select
          disabled={isSaving}
          onValueChange={(value) => selectPalette(value as SiteThemePaletteId)}
          value={resolvedTheme.palette}
        >
          <SelectTrigger aria-label="Brand color" className="w-full">
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

      {resolvedTheme.palette === "custom" ? (
        <div className="space-y-2">
          <Label
            className="text-xs font-medium text-muted-foreground"
            htmlFor={customColorInputId}
          >
            Custom brand color
          </Label>
          <Popover
            onOpenChange={(open) => {
              if (open) {
                setCustomColor(
                  resolvedTheme.brandColor ?? DEFAULT_CUSTOM_BRAND_COLOR,
                );
              } else if (!isSaving) {
                setCustomColor(
                  resolvedTheme.brandColor ?? DEFAULT_CUSTOM_BRAND_COLOR,
                );
              }
              setIsColorPickerOpen(open);
            }}
            open={isColorPickerOpen}
          >
            <PopoverTrigger asChild>
              <Button
                className="h-10 w-full justify-start px-3 font-normal"
                disabled={isSaving}
                id={customColorInputId}
                type="button"
                variant="outline"
              >
                <span
                  aria-hidden
                  className="size-5 rounded-md border border-black/10 shadow-xs dark:border-white/15"
                  style={{
                    backgroundColor:
                      normalizeBrandColor(customColor) ??
                      DEFAULT_CUSTOM_BRAND_COLOR,
                  }}
                />
                <span className="font-mono text-xs uppercase">
                  {normalizeBrandColor(customColor) ??
                    DEFAULT_CUSTOM_BRAND_COLOR}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 space-y-3 p-3">
              <ColorPicker
                disabled={isSaving}
                onValueChange={setCustomColor}
                value={
                  normalizeBrandColor(customColor) ?? DEFAULT_CUSTOM_BRAND_COLOR
                }
              />
              <div className="flex justify-end gap-2 border-t pt-3">
                <Button
                  disabled={isSaving}
                  onClick={() => {
                    setCustomColor(
                      resolvedTheme.brandColor ?? DEFAULT_CUSTOM_BRAND_COLOR,
                    );
                    setIsColorPickerOpen(false);
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button
                  disabled={isSaving || !isValidBrandColor(customColor)}
                  onClick={() => void applyCustomColor()}
                  size="sm"
                  type="button"
                >
                  {isSaving ? "Applying..." : "Apply"}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Theme style</p>
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
          <SelectTrigger aria-label="Theme style" className="w-full">
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

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Sidebar style
        </p>
        <Select
          disabled={isSaving}
          onValueChange={(value) => {
            const nextVariant = value as SiteSidebarVariant;
            if (nextVariant === resolvedSidebarVariant) return;
            setIsSaving(true);
            void updateSite({
              siteId,
              settings: { sidebarVariant: nextVariant },
            })
              .catch(() => toast.error("Failed to update sidebar style"))
              .finally(() => setIsSaving(false));
          }}
          value={resolvedSidebarVariant}
        >
          <SelectTrigger aria-label="Sidebar style" className="w-full">
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
