"use client";

import { api, type Id } from "@baseblocks/backend";
import {
  DEFAULT_CUSTOM_BRAND_COLOR,
  getSiteThemePreviewColors,
  isValidBrandColor,
  normalizeBrandColor,
  resolveSiteTheme,
  type SiteThemePaletteId,
  type SiteThemeSettings,
  type SiteThemeStyleId,
} from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
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

const ALL_PALETTE_OPTIONS: Array<{
  id: SiteThemePaletteId;
  label: string;
}> = [...PALETTE_OPTIONS, { id: "custom", label: "Custom" }];

export function SiteAppearanceSettings({
  siteId,
  theme,
}: {
  siteId: Id<"sites">;
  theme?: SiteThemeSettings;
}) {
  const updateSite = useMutation(api.sites.update);
  const resolvedTheme = resolveSiteTheme(theme);
  const [customColor, setCustomColor] = useState(
    resolvedTheme.brandColor ?? DEFAULT_CUSTOM_BRAND_COLOR,
  );
  const [isSaving, setIsSaving] = useState(false);
  const customColorInputId = useId();

  const saveTheme = async (nextTheme: SiteThemeSettings) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await updateSite({ siteId, settings: { theme: nextTheme } });
    } catch (_error) {
      toast.error("Failed to update site appearance");
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

  const applyCustomColor = () => {
    const brandColor = normalizeBrandColor(customColor);
    if (!brandColor) return;
    setCustomColor(brandColor);
    void saveTheme({
      ...resolvedTheme,
      palette: "custom",
      brandColor,
    });
  };

  const selectedPaletteLabel =
    ALL_PALETTE_OPTIONS.find((option) => option.id === resolvedTheme.palette)
      ?.label ?? "Neutral";
  const selectedStyleLabel =
    STYLE_OPTIONS.find((option) => option.id === resolvedTheme.style)?.label ??
    "Subtle";

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
        <div className="space-y-2 rounded-lg bg-muted/25 p-3">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor={customColorInputId}
          >
            Custom brand color
          </label>
          <div className="flex gap-2">
            <Input
              aria-label="Choose custom brand color"
              className="size-9 shrink-0 cursor-pointer p-1"
              disabled={isSaving}
              onChange={(event) => setCustomColor(event.target.value)}
              type="color"
              value={
                normalizeBrandColor(customColor) ?? DEFAULT_CUSTOM_BRAND_COLOR
              }
            />
            <Input
              aria-invalid={!isValidBrandColor(customColor)}
              className="h-9 min-w-0 font-mono"
              disabled={isSaving}
              id={customColorInputId}
              maxLength={7}
              onChange={(event) => setCustomColor(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && isValidBrandColor(customColor)) {
                  applyCustomColor();
                }
              }}
              placeholder="#2563eb"
              spellCheck={false}
              value={customColor}
            />
            <Button
              className="h-9"
              disabled={isSaving || !isValidBrandColor(customColor)}
              onClick={applyCustomColor}
              size="sm"
            >
              Apply
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            BaseBlocks creates accessible light and dark variants from this one
            color.
          </p>
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
