import type { SiteCustomization } from "@baseblocks/domain/site-settings";
import type { CSSProperties } from "react";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  return {
    r: Number.parseInt(result[1]!, 16),
    g: Number.parseInt(result[2]!, 16),
    b: Number.parseInt(result[3]!, 16),
  };
}

function srgbToLinear(value: number): number {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function getForegroundColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ffffff";

  const luminance =
    0.2126 * srgbToLinear(rgb.r) +
    0.7152 * srgbToLinear(rgb.g) +
    0.0722 * srgbToLinear(rgb.b);

  return luminance > 0.179 ? "#000000" : "#ffffff";
}

function lightenColor(hex: string, amount = 0.2): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const lighten = (value: number) =>
    Math.min(255, Math.round(value + (255 - value) * amount));

  const r = lighten(rgb.r).toString(16).padStart(2, "0");
  const g = lighten(rgb.g).toString(16).padStart(2, "0");
  const b = lighten(rgb.b).toString(16).padStart(2, "0");

  return `#${r}${g}${b}`;
}

function tintColor(hex: string, amount = 0.9): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const tint = (value: number) =>
    Math.min(255, Math.round(value + (255 - value) * amount));

  const r = tint(rgb.r).toString(16).padStart(2, "0");
  const g = tint(rgb.g).toString(16).padStart(2, "0");
  const b = tint(rgb.b).toString(16).padStart(2, "0");

  return `#${r}${g}${b}`;
}

function darkTintColor(hex: string, amount = 0.85): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const darken = (value: number) =>
    Math.max(0, Math.round(value * (1 - amount)));

  const r = darken(rgb.r).toString(16).padStart(2, "0");
  const g = darken(rgb.g).toString(16).padStart(2, "0");
  const b = darken(rgb.b).toString(16).padStart(2, "0");

  return `#${r}${g}${b}`;
}

const DARK_COLOR_PRESETS: Record<string, string> = {
  "#022364": "#1E4D8C",
  "#D20567": "#E84A93",
  "#0066FF": "#3B82F6",
  "#8B5CF6": "#A78BFA",
  "#EC4899": "#F472B6",
  "#EF4444": "#F87171",
  "#F97316": "#FB923C",
  "#EAB308": "#FACC15",
  "#22C55E": "#4ADE80",
  "#14B8A6": "#2DD4BF",
  "#64748B": "#94A3B8",
};

function getDarkColorForPreset(hex: string): string | undefined {
  return DARK_COLOR_PRESETS[hex.toUpperCase()];
}

function getBaseRadiusValue(preset: string): string {
  switch (preset) {
    case "none":
      return "0rem";
    case "small":
      return "0.25rem";
    case "medium":
      return "0.5rem";
    case "large":
      return "0.75rem";
    case "full":
      return "1.5rem";
    default:
      return "0.5rem";
  }
}

export function generateCustomizationStyles(
  customization?: SiteCustomization,
): CSSProperties {
  if (!customization) {
    return {};
  }

  const styles: Record<string, string> = {};

  if (customization.accentColor) {
    const foreground = getForegroundColor(customization.accentColor);
    styles["--primary"] = customization.accentColor;
    styles["--primary-foreground"] = foreground;
    styles["--ring"] = customization.accentColor;

    const darkColor =
      customization.accentColorDark ||
      getDarkColorForPreset(customization.accentColor) ||
      lightenColor(customization.accentColor, 0.2);

    styles["--site-primary-dark"] = darkColor;
    styles["--site-primary-foreground-dark"] = getForegroundColor(darkColor);
  }

  if (customization.headerColor) {
    styles["--site-header-bg"] = customization.headerColor;
    styles["--site-header-fg"] = getForegroundColor(customization.headerColor);

    const darkHeader =
      customization.headerColorDark ||
      getDarkColorForPreset(customization.headerColor) ||
      lightenColor(customization.headerColor, 0.2);

    styles["--site-header-bg-dark"] = darkHeader;
    styles["--site-header-fg-dark"] = getForegroundColor(darkHeader);
  }

  if (customization.secondaryColor) {
    styles["--site-accent"] = customization.secondaryColor;
    styles["--site-accent-light-bg"] = tintColor(
      customization.secondaryColor,
      0.88,
    );
    styles["--site-accent-light-fg"] = customization.secondaryColor;

    const darkSecondary =
      customization.secondaryColorDark ||
      getDarkColorForPreset(customization.secondaryColor) ||
      lightenColor(customization.secondaryColor, 0.2);

    styles["--site-accent-dark"] = darkSecondary;
    styles["--site-accent-bg-dark"] = darkTintColor(darkSecondary, 0.8);
    styles["--site-accent-fg-dark"] = darkSecondary;
  }

  if (customization.accentColor) {
    const gradientStops = [customization.accentColor];
    if (customization.tertiaryColor) {
      gradientStops.push(customization.tertiaryColor);
    }
    if (customization.secondaryColor) {
      gradientStops.push(customization.secondaryColor);
    }
    if (gradientStops.length >= 2) {
      styles["--site-gradient"] =
        `linear-gradient(to right, ${gradientStops.join(", ")})`;
    }
  }

  if (customization.borderRadius) {
    const radiusValue = getBaseRadiusValue(customization.borderRadius);
    styles["--radius"] = radiusValue;
    styles["--radius-sm"] = `max(0px, calc(${radiusValue} - 4px))`;
    styles["--radius-md"] = `max(0px, calc(${radiusValue} - 2px))`;
    styles["--radius-lg"] = radiusValue;
    styles["--radius-xl"] = `calc(${radiusValue} + 4px)`;
    styles["--radius-2xl"] = `calc(${radiusValue} + 8px)`;
    styles["--radius-3xl"] = `calc(${radiusValue} + 12px)`;
    styles["--radius-4xl"] = `calc(${radiusValue} + 16px)`;

    if (customization.borderRadius === "full") {
      styles["--radius-pill"] = "9999px";
    }
  }

  return styles as CSSProperties;
}

export function hasCustomization(customization?: SiteCustomization): boolean {
  if (!customization) return false;
  return !!(
    customization.accentColor ||
    customization.headerColor ||
    customization.secondaryColor ||
    customization.borderRadius
  );
}

export function useCustomizationStyles(
  customization: SiteCustomization | undefined,
): CSSProperties {
  return generateCustomizationStyles(customization);
}
