/**
 * Navigation exports
 *
 * Navigation is configured at the site level via the Navigation category in the element picker.
 * This module exports the config panel and re-exports navigation types.
 */

export { NavigationConfigPanel } from "./config-panel";

export type {
  NavigationStyle,
  NavigationItem,
  NavigationConfig,
  NavigationStyleInfo,
} from "@baseblocks/types/elements/navigation";

export {
  DEFAULT_NAVIGATION_CONFIG,
  NAVIGATION_STYLES,
  getNavigationStyleInfo,
} from "@baseblocks/types/elements/navigation";
