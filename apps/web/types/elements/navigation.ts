/**
 * Navigation element types and content definitions
 * Navigation elements for menus, breadcrumbs, and site navigation
 */

// Navigation element types (stubs for future implementation)
export type NavType =
  | "sidebar-pages" // Page tree navigation
  | "top-bar" // Top navigation bar
  | "breadcrumbs"; // Breadcrumb trail

// Navigation content interfaces

export interface SidebarPagesContent {
  showIcons?: boolean;
  maxDepth?: number;
  collapsible?: boolean;
}

export interface TopBarContent {
  logo?: string;
  links?: Array<{
    id: string;
    label: string;
    url: string;
  }>;
  showSearch?: boolean;
}

export interface BreadcrumbsContent {
  separator?: string;
  showHome?: boolean;
  homeLabel?: string;
}

// Union of all navigation content types
export type NavContentUnion =
  | SidebarPagesContent
  | TopBarContent
  | BreadcrumbsContent;

// Default content for new navigation elements
export const DEFAULT_NAV_CONTENT: Record<NavType, NavContentUnion> = {
  "sidebar-pages": {
    showIcons: true,
    maxDepth: 3,
    collapsible: true,
  },
  "top-bar": {
    links: [],
    showSearch: true,
  },
  breadcrumbs: {
    separator: "/",
    showHome: true,
    homeLabel: "Home",
  },
};
