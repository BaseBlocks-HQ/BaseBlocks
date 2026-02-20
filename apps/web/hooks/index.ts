/**
 * Custom hooks barrel exports
 */

export {
  useDebounceCallback,
  useDebounceCallbackWithFlush,
} from "@repo/ui/hooks/use-debounce";
export { useIsMobile } from "@repo/ui/hooks/use-mobile";

// Editor hooks (re-exported from @repo/editor)
export { usePermissions, useSitePermissions } from "@repo/editor";

// App hooks
export { useSaveStatus } from "./use-save-status";
export { usePageSelection } from "./use-page-selection";
export { useLocalStorage } from "./use-local-storage";
export { usePageExpandState } from "./use-page-expand-state";
export {
  useSiteCustomization,
  useCustomizationStyles,
} from "./use-site-customization";
export { useBannerDismissals } from "./use-banner-dismissals";
