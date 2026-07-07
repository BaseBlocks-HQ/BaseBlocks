export type BorderRadiusPreset = "none" | "small" | "medium" | "large" | "full";

export interface SiteCustomization {
  accentColor?: string; // Hex color (e.g., "#0066FF") — primary buttons, links, focus
  accentColorDark?: string; // Optional dark mode variant
  headerColor?: string; // Header background color
  headerColorDark?: string; // Header dark mode variant
  secondaryColor?: string; // Accent/gradient secondary color
  secondaryColorDark?: string; // Secondary dark mode variant
  tertiaryColor?: string; // Third gradient color
  tertiaryColorDark?: string; // Third dark mode variant
  showHeaderGradient?: boolean; // Gradient stripe under header
  borderRadius?: BorderRadiusPreset;
}

export const DEFAULT_CUSTOMIZATION: Required<
  Pick<SiteCustomization, "accentColor" | "accentColorDark" | "borderRadius">
> = {
  accentColor: "#0066FF", // Blue
  accentColorDark: "#3B82F6", // Lighter blue for dark mode
  borderRadius: "medium",
};
