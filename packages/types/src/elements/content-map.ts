import type {
  BannerContent,
  BlockSpacerContent,
  BlockType,
  CalloutContent,
  CodeContent,
  DecisionTreeContent,
  DirectoryContent,
  DividerContent,
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

import type { FormContent, FormType } from "./forms";

import type { LayoutSettings, LayoutType } from "../layouts";

export type ElementType = BlockType | SectionType | MediaType | FormType;

export type AllElementType = LayoutType | ElementType;

export type ContentTypeMap = {
  heading: HeadingContent;
  paragraph: ParagraphContent;
  callout: CalloutContent;
  code: CodeContent;
  divider: DividerContent;
  "block-spacer": BlockSpacerContent;
  richtext: RichTextContent;
  subpage: SubpageContent;
  banner: BannerContent;
  directory: DirectoryContent;
  flowchart: FlowchartContent;
  "decision-tree": DecisionTreeContent;

  search: SearchContent;
  library: LibraryContent;
  quicklinks: QuicklinksContent;

  image: ImageContent;

  form: FormContent;
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
