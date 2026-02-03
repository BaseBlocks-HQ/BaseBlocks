/**
 * CSS variable generator for site customization
 * Generates inline styles that scope customization to content areas
 */

import type { CSSProperties } from "react";
import type { SiteCustomization } from "@/types/elements/customization";
import {
  getDarkColorForPreset,
} from "@/types/elements/customization";
import { getForegroundColor, lightenColor } from "./color-utils";

/**
 * Get the base radius value for a preset
 * For "full", we use a large but reasonable value for cards,
 * and let specific components have the pill shape via CSS
 */
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
      // For "full", use large radius for cards, but buttons/inputs get pill via CSS
      return "0.75rem";
    default:
      return "0.5rem";
  }
}

/**
 * Generate CSS custom properties for site customization
 * Returns empty object if no customization is set
 */
export function generateCustomizationStyles(
  customization?: SiteCustomization
): CSSProperties {
  // Return empty if no customization at all
  if (!customization) {
    return {};
  }

  const styles: Record<string, string> = {};

  // Only set accent color if explicitly provided
  if (customization.accentColor) {
    const foreground = getForegroundColor(customization.accentColor);

    // Set primary color using hex directly (CSS supports it)
    styles["--primary"] = customization.accentColor;
    styles["--primary-foreground"] = foreground;
    styles["--ring"] = customization.accentColor;

    // Dark mode variant
    const darkColor = customization.accentColorDark ||
      getDarkColorForPreset(customization.accentColor) ||
      lightenColor(customization.accentColor, 0.2);

    const darkForeground = getForegroundColor(darkColor);
    styles["--site-primary-dark"] = darkColor;
    styles["--site-primary-foreground-dark"] = darkForeground;
  }

  // Only set border radius if explicitly provided
  if (customization.borderRadius) {
    const radiusValue = getBaseRadiusValue(customization.borderRadius);
    styles["--radius"] = radiusValue;

    // Override all radius variants explicitly to ensure Tailwind utilities cascade
    styles["--radius-sm"] = `max(0px, calc(${radiusValue} - 4px))`;
    styles["--radius-md"] = `max(0px, calc(${radiusValue} - 2px))`;
    styles["--radius-lg"] = radiusValue;
    styles["--radius-xl"] = `calc(${radiusValue} + 4px)`;
    styles["--radius-2xl"] = `calc(${radiusValue} + 8px)`;
    styles["--radius-3xl"] = `calc(${radiusValue} + 12px)`;
    styles["--radius-4xl"] = `calc(${radiusValue} + 16px)`;

    // For "full" preset, also set a special variable for pill-shaped elements
    if (customization.borderRadius === "full") {
      styles["--radius-pill"] = "9999px";
    }
  }

  return styles as CSSProperties;
}

/**
 * Check if customization has any values set
 */
export function hasCustomization(customization?: SiteCustomization): boolean {
  if (!customization) return false;
  return !!(customization.accentColor || customization.borderRadius);
}
