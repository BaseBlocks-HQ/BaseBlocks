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
