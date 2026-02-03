/**
 * Unified Element Type System
 * Central exports for all element-related types
 */

// Categories
export type {
  ElementCategory,
  CategoryInfo,
} from "./categories";
export {
  CATEGORIES,
  getCategoryInfo,
  getSortedCategories,
} from "./categories";

// Layout types
export type {
  LayoutType,
  SpacerLayoutHeight,
  LayoutSettings,
  LayoutTypeInfo,
} from "./layouts";
export {
  LAYOUT_SLOT_COUNTS,
  DEFAULT_LAYOUT_SETTINGS,
  LAYOUT_TYPES,
} from "./layouts";

// Block types
export type {
  BlockType,
  HeadingContent,
  ParagraphContent,
  CalloutContent,
  CodeContent,
  DividerContent,
  BlockSpacerContent,
  BlockContentUnion,
} from "./blocks";
export { DEFAULT_BLOCK_CONTENT } from "./blocks";

// Section types
export type {
  SectionType,
  SearchContent,
  LibraryContent,
  QuicklinkType,
  QuicklinkItem,
  QuicklinksContent,
  SectionContentUnion,
} from "./sections";
export { DEFAULT_SECTION_CONTENT } from "./sections";

// Navigation types (site-level configuration, not content elements)
export type {
  NavigationStyle,
  NavigationItem,
  NavigationConfig,
  NavigationStyleInfo,
} from "./navigation";
export {
  DEFAULT_NAVIGATION_CONFIG,
  NAVIGATION_STYLES,
  getNavigationStyleInfo,
} from "./navigation";

// Customization types (site-level styling)
export type {
  BorderRadiusPreset,
  SiteCustomization,
  RadiusPresetInfo,
  ColorPreset,
} from "./customization";
export {
  DEFAULT_CUSTOMIZATION,
  BORDER_RADIUS_PRESETS,
  COLOR_PRESETS,
  getRadiusCssValue,
  getDarkColorForPreset,
} from "./customization";

// Media types
export type { MediaType, ImageContent, MediaContentUnion } from "./media";
export { DEFAULT_MEDIA_CONTENT } from "./media";

// Form types
export type {
  FormType,
  FormFieldType,
  FormField,
  FormContent,
  FieldOption,
  FieldValidation,
  BaseField,
  ShortTextField,
  LongTextField,
  EmailField,
  NumberField,
  SelectField,
  CheckboxField,
  RadioField,
  DateField,
} from "./forms";
export {
  DEFAULT_FORM_CONTENT,
  generateFieldId,
  createField,
  getFieldTypeLabel,
} from "./forms";

// Content mapping
export type {
  ElementType,
  AllElementType,
  ContentTypeMap,
  LayoutSettingsMap,
  ContentFor,
  AnyContent,
  TypedElementData,
} from "./content-map";

// Save status (shared across all elements)
export type SaveStatus = "idle" | "pending" | "saving" | "saved";
