/**
 * Navigation style definitions for site-level navigation configuration
 * These control how page navigation is rendered on public sites
 */

/**
 * Available navigation styles for a site
 * - sidebar: Vertical page tree in left sidebar (default)
 * - topnav: Horizontal navigation menu in header with dropdowns for nested pages
 * - subnav: Secondary horizontal tab bar below header with dropdown support
 */
export type NavigationStyle = "sidebar" | "topnav" | "subnav";

/**
 * Navigation item representing a page in the navigation tree
 */
export interface NavigationItem {
  id: string;
  title: string;
  slug: string;
  path: string; // Full path for routing
  icon?: string;
  children?: NavigationItem[];
}

/**
 * Configuration for navigation display
 */
export interface NavigationConfig {
  style: NavigationStyle;
  /** Maximum depth to show in navigation (0 = unlimited) */
  maxDepth?: number;
  /** Show icons next to navigation items */
  showIcons?: boolean;
  /** Collapse behavior for nested items */
  collapsible?: boolean;
}

/**
 * Default navigation configuration
 */
export const DEFAULT_NAVIGATION_CONFIG: NavigationConfig = {
  style: "sidebar",
  maxDepth: 0,
  showIcons: true,
  collapsible: true,
};

/**
 * Navigation style metadata for UI display
 */
export interface NavigationStyleInfo {
  style: NavigationStyle;
  label: string;
  description: string;
  icon: string; // Lucide icon name
}

/**
 * Available navigation styles with metadata
 */
export const NAVIGATION_STYLES: NavigationStyleInfo[] = [
  {
    style: "sidebar",
    label: "Sidebar",
    description: "Vertical page tree in a left sidebar",
    icon: "PanelLeft",
  },
  {
    style: "topnav",
    label: "Top Nav",
    description: "Horizontal menu in the header with dropdowns",
    icon: "Menu",
  },
  {
    style: "subnav",
    label: "Tab Bar",
    description: "Horizontal tabs below the header",
    icon: "LayoutList",
  },
];

/**
 * Get navigation style info
 */
export function getNavigationStyleInfo(
  style: NavigationStyle,
): NavigationStyleInfo | undefined {
  return NAVIGATION_STYLES.find((s) => s.style === style);
}
