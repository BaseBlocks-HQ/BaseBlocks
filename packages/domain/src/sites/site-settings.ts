export type NavigationStyle = "sidebar" | "topnav" | "subnav";

export interface NavigationItem {
  id: string;
  title: string;
  slug: string;
  path: string;
  icon?: string;
  children?: NavigationItem[];
}

export type BorderRadiusPreset = "none" | "small" | "medium" | "large" | "full";

export interface SiteCustomization {
  accentColor?: string;
  accentColorDark?: string;
  headerColor?: string;
  headerColorDark?: string;
  secondaryColor?: string;
  secondaryColorDark?: string;
  tertiaryColor?: string;
  tertiaryColorDark?: string;
  showHeaderGradient?: boolean;
  borderRadius?: BorderRadiusPreset;
}

export const DEFAULT_CUSTOMIZATION: Required<
  Pick<SiteCustomization, "accentColor" | "accentColorDark" | "borderRadius">
> = {
  accentColor: "#0066FF",
  accentColorDark: "#3B82F6",
  borderRadius: "medium",
};
