/**
 * App-level hooks
 *
 * For cross-package hooks, import directly from their source:
 * - Debounce: import from "@baseblocks/ui/hooks/use-debounce"
 * - Mobile detection: import from "@baseblocks/ui/hooks/use-mobile"
 * - Permissions: import from "@baseblocks/editor"
 */

export { useSaveStatus } from "./use-save-status";
export { usePageSelection } from "./use-page-selection";
export { useLocalStorage } from "./use-local-storage";
export { usePageExpandState } from "./use-page-expand-state";
export {
  useSiteCustomization,
  useCustomizationStyles,
} from "./use-site-customization";
export { useBannerDismissals } from "./use-banner-dismissals";
