/**
 * Custom hooks barrel exports
 */

// Existing hooks
export {
  useDebounceCallback,
  useDebounceCallbackWithFlush,
} from "./use-debounce";
export { useIsMobile } from "./use-mobile";

// New hooks
export { useSaveStatus } from "./use-save-status";
export { usePageSelection } from "./use-page-selection";
export { useLocalStorage } from "./use-local-storage";
export { usePageExpandState } from "./use-page-expand-state";
export { usePermissions, useSitePermissions } from "./use-permissions";
export {
  useSiteCustomization,
  useCustomizationStyles,
} from "./use-site-customization";
export { useBannerDismissals } from "./use-banner-dismissals";
