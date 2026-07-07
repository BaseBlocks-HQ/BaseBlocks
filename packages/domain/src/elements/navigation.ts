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
