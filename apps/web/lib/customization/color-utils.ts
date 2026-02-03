/**
 * Color utility functions for site customization
 */

/**
 * Parse hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  return {
    r: parseInt(result[1]!, 16),
    g: parseInt(result[2]!, 16),
    b: parseInt(result[3]!, 16),
  };
}

/**
 * Convert sRGB to linear RGB (for luminance calculation)
 */
function srgbToLinear(value: number): number {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Compute contrasting foreground color (white or black)
 * Uses relative luminance calculation
 */
export function computeContrastingForeground(hex: string): "white" | "black" {
  const rgb = hexToRgb(hex);
  if (!rgb) return "white";

  // Calculate relative luminance
  const luminance =
    0.2126 * srgbToLinear(rgb.r) +
    0.7152 * srgbToLinear(rgb.g) +
    0.0722 * srgbToLinear(rgb.b);

  // Use white text for dark backgrounds, black for light
  return luminance > 0.179 ? "black" : "white";
}

/**
 * Get foreground color value based on contrast
 */
export function getForegroundColor(hex: string): string {
  const contrast = computeContrastingForeground(hex);
  return contrast === "white" ? "#ffffff" : "#000000";
}

/**
 * Lighten a hex color for dark mode variant
 */
export function lightenColor(hex: string, amount: number = 0.2): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const lighten = (value: number) =>
    Math.min(255, Math.round(value + (255 - value) * amount));

  const r = lighten(rgb.r).toString(16).padStart(2, "0");
  const g = lighten(rgb.g).toString(16).padStart(2, "0");
  const b = lighten(rgb.b).toString(16).padStart(2, "0");

  return `#${r}${g}${b}`;
}

/**
 * Validate hex color format
 */
export function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}
