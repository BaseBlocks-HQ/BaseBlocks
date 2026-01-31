/**
 * Centralized type exports
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

// Block types
export type {
  BlockType,
  HeadingContent,
  ParagraphContent,
  ImageContent,
  FileContent,
  DividerContent,
  CalloutContent,
  CodeContent,
  EmbedContent,
  TableContent,
  LibraryContent,
  SearchContent,
  QuicklinkType,
  QuicklinkItem,
  QuicklinksContent,
  BlockContent,
  TypedBlock,
  BlockEditorProps,
  BlockRendererProps,
  SaveStatus,
  SpacerContent,
} from "./blocks";
export { DEFAULT_BLOCK_CONTENT } from "./blocks";

// Page types
export type {
  PageListItem,
  PageWithChildren,
  PageWithBlocks,
  SiteWithCompany,
} from "./pages";

// Layout types
export type {
  LayoutType,
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
// NEW UNIFIED ELEMENT SYSTEM
// These exports are from the new category-based element system
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

// Element types (new unified types)
export type {
  ElementType,
  AllElementType,
  ContentTypeMap,
  ContentFor,
  AnyContent,
  TypedElementData,
} from "./elements";

// New block types (content primitives only)
export type {
  BlockType as NewBlockType,
  BlockContentUnion,
  BlockSpacerContent,
} from "./elements";
export { DEFAULT_BLOCK_CONTENT as NEW_DEFAULT_BLOCK_CONTENT } from "./elements";

// Section types (moved from blocks: search, library, quicklinks)
export type {
  SectionType,
  HeroContent,
  SectionContentUnion,
} from "./elements";
export { DEFAULT_SECTION_CONTENT } from "./elements";

// Navigation types (future)
export type {
  NavType,
  SidebarPagesContent,
  TopBarContent,
  BreadcrumbsContent,
  NavContentUnion,
} from "./elements";
export { DEFAULT_NAV_CONTENT } from "./elements";

// Media types (moved from blocks: image, file)
export type {
  MediaType,
  VideoContent,
  AudioContent,
  YouTubeEmbedContent,
  GalleryContent,
  MediaContentUnion,
} from "./elements";
export { DEFAULT_MEDIA_CONTENT } from "./elements";

// Form types (future)
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
