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
  HeroContent,
  SearchContent,
  LibraryContent,
  QuicklinkType,
  QuicklinkItem,
  QuicklinksContent,
  SectionContentUnion,
} from "./sections";
export { DEFAULT_SECTION_CONTENT } from "./sections";

// Navigation types
export type {
  NavType,
  SidebarPagesContent,
  TopBarContent,
  BreadcrumbsContent,
  NavContentUnion,
} from "./navigation";
export { DEFAULT_NAV_CONTENT } from "./navigation";

// Media types
export type {
  MediaType,
  ImageContent,
  FileContent,
  VideoContent,
  AudioContent,
  YouTubeEmbedContent,
  GalleryContent,
  MediaContentUnion,
} from "./media";
export { DEFAULT_MEDIA_CONTENT } from "./media";

// Form types
export type {
  FormType,
  FormContent,
  TextInputContent,
  TextareaContent,
  SelectContent,
  CheckboxContent,
  RadioContent,
  SubmitButtonContent,
  FormContentUnion,
} from "./forms";
export { DEFAULT_FORM_CONTENT } from "./forms";

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
