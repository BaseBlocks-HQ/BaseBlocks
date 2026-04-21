import type {
  BlockSpacerContent,
  BlockType,
  CalloutContent,
  CodeContent,
  DecisionTreeContent,
  DirectoryContent,
  DividerContent,
  FileContent,
  FlowchartContent,
  HeadingContent,
  ParagraphContent,
  RichTextContent,
  SubpageContent,
} from "./blocks";

import type {
  LibraryContent,
  QuicklinksContent,
  SearchContent,
  SectionType,
} from "./sections";

import type { ImageContent, MediaType } from "./media";

import type { LayoutSettings, LayoutType } from "../layouts";

export type ElementType = BlockType | SectionType | MediaType;

export type AllElementType = LayoutType | ElementType;

export type ContentTypeMap = {
  heading: HeadingContent;
  paragraph: ParagraphContent;
  callout: CalloutContent;
  code: CodeContent;
  divider: DividerContent;
  "block-spacer": BlockSpacerContent;
  file: FileContent;
  richtext: RichTextContent;
  subpage: SubpageContent;
  directory: DirectoryContent;
  flowchart: FlowchartContent;
  "decision-tree": DecisionTreeContent;

  search: SearchContent;
  library: LibraryContent;
  quicklinks: QuicklinksContent;

  image: ImageContent;
};

export type LayoutSettingsMap = {
  single: LayoutSettings;
  rows: LayoutSettings;
  columns: LayoutSettings;
  grid: LayoutSettings;
  spacer: LayoutSettings;
  vertical: LayoutSettings;
};

export type ContentFor<T extends ElementType> = T extends keyof ContentTypeMap
  ? ContentTypeMap[T]
  : never;

export type AnyContent = ContentTypeMap[keyof ContentTypeMap];

export interface TypedElementData<T extends ElementType = ElementType> {
  id: string;
  type: T;
  content: ContentFor<T>;
}
