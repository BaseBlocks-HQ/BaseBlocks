/**
 * Centralized type exports
 * Unified Element System
 */

// Convex document and ID types
export type {
  Team,
  Site,
  Page,
  Layout,
  Document,
  TeamId,
  SiteId,
  PageId,
  LayoutId,
  DocumentId,
  Doc,
  Id,
} from "./convex";

// Page types
export type {
  PageListItem,
  PageWithChildren,
  SiteWithTeam,
} from "./pages";

// Layout types
export type {
  LayoutType,
  LayoutBlockType,
  LayoutBlockData,
  LayoutSlot,
  LayoutSettings,
  LayoutData,
  LayoutTypeInfo,
  SpacerLayoutHeight,
} from "./layouts";
export {
  LAYOUT_SLOT_COUNTS,
  DEFAULT_LAYOUT_SETTINGS,
  LAYOUT_TYPES,
} from "./layouts";

// ============================================================
// UNIFIED ELEMENT SYSTEM
// All element types, content interfaces, and defaults
// ============================================================

// Element categories
export type {
  ElementCategory,
  CategoryInfo,
} from "./elements";
export {
  CATEGORIES,
  getCategoryInfo,
  getSortedCategories,
} from "./elements";

// Element types (unified types)
export type {
  ElementType,
  AllElementType,
  ContentTypeMap,
  ContentFor,
  AnyContent,
  TypedElementData,
  SaveStatus,
} from "./elements";

// Block types (content primitives)
export type {
  BlockType,
  HeadingContent,
  ParagraphContent,
  CalloutContent,
  CodeContent,
  DividerContent,
  BlockSpacerContent,
  BlockContentUnion,
} from "./elements";
export { DEFAULT_BLOCK_CONTENT } from "./elements";

// Section types (search, library, quicklinks)
export type {
  SectionType,
  SearchContent,
  LibraryContent,
  QuicklinkType,
  QuicklinkItem,
  QuicklinksContent,
  SectionContentUnion,
} from "./elements";
export { DEFAULT_SECTION_CONTENT } from "./elements";

// Navigation types (site-level configuration, not content elements)
export type {
  NavigationStyle,
  NavigationItem,
  NavigationConfig,
  NavigationStyleInfo,
} from "./elements";
export {
  DEFAULT_NAVIGATION_CONFIG,
  NAVIGATION_STYLES,
  getNavigationStyleInfo,
} from "./elements";

// Media types (image)
export type { MediaType, ImageContent, MediaContentUnion } from "./elements";
export { DEFAULT_MEDIA_CONTENT } from "./elements";

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
} from "./elements";
export {
  DEFAULT_FORM_CONTENT,
  generateFieldId,
  createField,
  getFieldTypeLabel,
} from "./elements";
