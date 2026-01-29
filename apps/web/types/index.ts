/**
 * Centralized type exports
 */

// Convex document and ID types
export type {
  Company,
  Site,
  Page,
  Block,
  Section,
  Document,
  AccessLink,
  AccessLog,
  CompanyId,
  SiteId,
  PageId,
  BlockId,
  SectionId,
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
  DocumentLibraryContent,
  SearchContent,
  QuicklinkType,
  QuicklinkItem,
  QuicklinksContent,
  BlockContent,
  TypedBlock,
  BlockEditorProps,
  BlockRendererProps,
  SaveStatus,
} from "./blocks";
export { DEFAULT_BLOCK_CONTENT } from "./blocks";

// Page types
export type {
  PageListItem,
  PageWithChildren,
  PageWithBlocks,
  SiteWithCompany,
} from "./pages";

// Section types
export type {
  SectionLayout,
  SectionBlockData,
  SectionSlot,
  SectionSettings,
  SectionData,
  SectionTypeInfo,
} from "./sections";
export {
  LAYOUT_SLOT_COUNTS,
  DEFAULT_SECTION_SETTINGS,
  SECTION_TYPES,
} from "./sections";
