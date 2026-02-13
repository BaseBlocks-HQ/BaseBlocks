/**
 * Site customization types and presets
 * Defines accent colors and border radius options for site theming
 */

// Border radius preset options
export type BorderRadiusPreset = "none" | "small" | "medium" | "large" | "full";

// Site customization settings stored in database
export interface SiteCustomization {
  accentColor?: string;        // Hex color (e.g., "#0066FF") — primary buttons, links, focus
  accentColorDark?: string;    // Optional dark mode variant
  headerColor?: string;        // Header background color
  headerColorDark?: string;    // Header dark mode variant
  secondaryColor?: string;     // Accent/gradient secondary color
  secondaryColorDark?: string; // Secondary dark mode variant
  showHeaderGradient?: boolean; // Gradient stripe under header
  borderRadius?: BorderRadiusPreset;
}

// Default customization values
export const DEFAULT_CUSTOMIZATION: Required<Pick<SiteCustomization, 'accentColor' | 'accentColorDark' | 'borderRadius'>> = {
  accentColor: "#0066FF",      // Blue
  accentColorDark: "#3B82F6",  // Lighter blue for dark mode
  borderRadius: "medium",
};

// Border radius preset information
export interface RadiusPresetInfo {
  value: BorderRadiusPreset;
  label: string;
  cssValue: string;  // CSS rem value
}

// Border radius presets with their CSS values
export const BORDER_RADIUS_PRESETS: RadiusPresetInfo[] = [
  { value: "none", label: "None", cssValue: "0rem" },
  { value: "small", label: "Small", cssValue: "0.25rem" },
  { value: "medium", label: "Medium", cssValue: "0.5rem" },
  { value: "large", label: "Large", cssValue: "0.75rem" },
  { value: "full", label: "Full", cssValue: "9999px" },
];

// Color preset information
export interface ColorPreset {
  value: string;       // Hex color
  label: string;
  darkValue?: string;  // Optional dark mode variant
}

// Color presets for quick selection
export const COLOR_PRESETS: ColorPreset[] = [
  { value: "#022364", label: "Navy", darkValue: "#1E4D8C" },
  { value: "#D20567", label: "Magenta", darkValue: "#E84A93" },
  { value: "#0066FF", label: "Blue", darkValue: "#3B82F6" },
  { value: "#8B5CF6", label: "Purple", darkValue: "#A78BFA" },
  { value: "#EC4899", label: "Pink", darkValue: "#F472B6" },
  { value: "#EF4444", label: "Red", darkValue: "#F87171" },
  { value: "#F97316", label: "Orange", darkValue: "#FB923C" },
  { value: "#EAB308", label: "Yellow", darkValue: "#FACC15" },
  { value: "#22C55E", label: "Green", darkValue: "#4ADE80" },
  { value: "#14B8A6", label: "Teal", darkValue: "#2DD4BF" },
  { value: "#64748B", label: "Slate", darkValue: "#94A3B8" },
];

// Helper to get radius CSS value from preset
export function getRadiusCssValue(preset: BorderRadiusPreset): string {
  return BORDER_RADIUS_PRESETS.find((p) => p.value === preset)?.cssValue ?? "0.5rem";
}

// Helper to get dark color for a preset
export function getDarkColorForPreset(hex: string): string | undefined {
  return COLOR_PRESETS.find((p) => p.value.toLowerCase() === hex.toLowerCase())?.darkValue;
}
