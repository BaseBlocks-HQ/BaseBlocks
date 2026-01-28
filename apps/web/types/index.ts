/**
 * Centralized type exports
 */

// Convex document and ID types
export type {
  Company,
  Site,
  Page,
  Block,
  Document,
  AccessLink,
  AccessLog,
  CompanyId,
  SiteId,
  PageId,
  BlockId,
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
