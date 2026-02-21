/**
 * CSS variable generator for site customization
 * Generates inline styles that scope customization to content areas
 */

import type { SiteCustomization } from "@baseblocks/types/elements/customization";
import { getDarkColorForPreset } from "@baseblocks/types/elements/customization";
import type { CSSProperties } from "react";
import {
  darkTintColor,
  getForegroundColor,
  lightenColor,
  tintColor,
} from "./color-utils";

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
      // For "full", use a noticeably larger radius than "large" so containers
      // (e.g. TabsList) get a pill-like shape while cards stay reasonable
      return "1.5rem";
    default:
      return "0.5rem";
  }
}

/**
 * Generate CSS custom properties for site customization
 * Returns empty object if no customization is set
 */
export function generateCustomizationStyles(
  customization?: SiteCustomization,
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
    const darkColor =
      customization.accentColorDark ||
      getDarkColorForPreset(customization.accentColor) ||
      lightenColor(customization.accentColor, 0.2);

    const darkForeground = getForegroundColor(darkColor);
    styles["--site-primary-dark"] = darkColor;
    styles["--site-primary-foreground-dark"] = darkForeground;
  }

  // Header color
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

  // Secondary/accent color — sets staging vars; CSS rules map them to --accent
  if (customization.secondaryColor) {
    styles["--site-accent"] = customization.secondaryColor;
    // Light mode staging vars (CSS will map these to --accent / --accent-foreground)
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
    // Dark mode staging vars
    styles["--site-accent-bg-dark"] = darkTintColor(darkSecondary, 0.8);
    styles["--site-accent-fg-dark"] = darkSecondary;
  }

  // Gradient: primary → tertiary → secondary
  if (customization.accentColor) {
    const gradientStops = [customization.accentColor];
    if (customization.tertiaryColor)
      gradientStops.push(customization.tertiaryColor);
    if (customization.secondaryColor)
      gradientStops.push(customization.secondaryColor);
    if (gradientStops.length >= 2) {
      styles["--site-gradient"] =
        `linear-gradient(to right, ${gradientStops.join(", ")})`;
    }
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
  return !!(
    customization.accentColor ||
    customization.headerColor ||
    customization.secondaryColor ||
    customization.borderRadius
  );
}
