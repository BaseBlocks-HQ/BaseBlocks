/**
 * Unified Element System
 * Main entry point - imports all elements to register them with the registry
 */

// Import all element categories to trigger registrations
import "./layouts";
import "./blocks";
import "./sections";
import "./navigation";
import "./media";
import "./forms";

// Re-export registry
export {
  registerElement,
  registerLayout,
  getElement,
  getLayoutEntry,
  getAllElements,
  getAllLayouts,
  getElementsByCategory,
  getElementEditor,
  getElementRenderer,
  getElementPreview,
  getElementLabel,
  getElementIcon,
  getDefaultContent,
  isElementRegistered,
  getRegisteredElementTypes,
  getRegisteredLayoutTypes,
  searchElements,
  ElementRegistry,
} from "./registry";

// Re-export registry types
export type {
  ElementEditorProps,
  ElementRendererProps,
  ElementPreviewProps,
  ElementRegistryEntry,
  LayoutRegistryEntry,
  AnyRegistryEntry,
} from "./registry";

// Re-export category utilities
export {
  getCategoryInfo,
  getSortedCategories,
  categories,
  getCategoryKeys,
  isValidCategory,
  getCategoryLabel,
  getCategoryDescription,
  getCategoryIcon,
} from "./registry/categories";

// Re-export all element components
export * from "./layouts";
export * from "./blocks";
export * from "./sections";
export * from "./media";

// Element wrappers
export { ElementEditorWrapper } from "./element-editor-wrapper";
export { ElementRendererWrapper } from "./element-renderer-wrapper";
