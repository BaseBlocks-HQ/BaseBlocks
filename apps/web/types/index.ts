/**
 * Centralized type exports
 * Unified Element System
 */

// Convex document and ID types
export type {
  Company,
  Site,
  Page,
  Block,
  Layout,
  Document,
  AccessLink,
  AccessLog,
  CompanyId,
  SiteId,
  PageId,
  BlockId,
  LayoutId,
  DocumentId,
  AccessLinkId,
  AccessLogId,
  Doc,
  Id,
} from "./convex";

// Page types
export type {
  PageListItem,
  PageWithChildren,
  SiteWithCompany,
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

// Section types (search, library, quicklinks, hero)
export type {
  SectionType,
  HeroContent,
  SearchContent,
  LibraryContent,
  QuicklinkType,
  QuicklinkItem,
  QuicklinksContent,
  SectionContentUnion,
} from "./elements";
export { DEFAULT_SECTION_CONTENT } from "./elements";

// Navigation types
export type {
  NavType,
  SidebarPagesContent,
  TopBarContent,
  BreadcrumbsContent,
  NavContentUnion,
} from "./elements";
export { DEFAULT_NAV_CONTENT } from "./elements";

// Media types (image, file, video, etc.)
export type {
  MediaType,
  ImageContent,
  FileContent,
  VideoContent,
  AudioContent,
  YouTubeEmbedContent,
  GalleryContent,
  MediaContentUnion,
} from "./elements";
export { DEFAULT_MEDIA_CONTENT } from "./elements";

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
} from "./elements";
export { DEFAULT_FORM_CONTENT } from "./elements";
