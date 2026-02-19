/**
 * Navigation exports
 *
 * Navigation is configured at the site level via the Navigation category in the element picker.
 * This module exports the config panel and re-exports navigation types.
 */

// Navigation config panel for the element picker
export { NavigationConfigPanel } from "./navigation-config-panel";

// Re-export navigation types from the types module
export type {
  NavigationStyle,
  NavigationItem,
  NavigationConfig,
  NavigationStyleInfo,
} from "@repo/types/elements/navigation";

export {
  DEFAULT_NAVIGATION_CONFIG,
  NAVIGATION_STYLES,
  getNavigationStyleInfo,
} from "@repo/types/elements/navigation";
