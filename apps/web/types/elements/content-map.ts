/**
 * Content type mapping
 * Maps each ElementType to its corresponding content interface
 */

import type {
  BlockSpacerContent,
  BlockType,
  CalloutContent,
  CodeContent,
  DividerContent,
  HeadingContent,
  ParagraphContent,
} from "./blocks";

import type {
  LibraryContent,
  QuicklinksContent,
  SearchContent,
  SectionType,
} from "./sections";

import type {
  BreadcrumbsContent,
  NavType,
  SidebarPagesContent,
  TopBarContent,
} from "./navigation";

import type { ImageContent, MediaType } from "./media";

import type { FormContent, FormType } from "./forms";

import type { LayoutSettings, LayoutType } from "./layouts";

// Union of all element types (excluding layouts which are containers)
export type ElementType =
  | BlockType
  | SectionType
  | NavType
  | MediaType
  | FormType;

// Full element type including layouts
export type AllElementType = LayoutType | ElementType;

// Content type map - maps each element type to its content interface
export type ContentTypeMap = {
  // Blocks
  heading: HeadingContent;
  paragraph: ParagraphContent;
  callout: CalloutContent;
  code: CodeContent;
  divider: DividerContent;
  "block-spacer": BlockSpacerContent;

  // Sections
  search: SearchContent;
  library: LibraryContent;
  quicklinks: QuicklinksContent;

  // Navigation
  "sidebar-pages": SidebarPagesContent;
  "top-bar": TopBarContent;
  breadcrumbs: BreadcrumbsContent;

  // Media
  image: ImageContent;

  // Forms
  form: FormContent;
};

// Layout settings map
export type LayoutSettingsMap = {
  single: LayoutSettings;
  rows: LayoutSettings;
  columns: LayoutSettings;
  grid: LayoutSettings;
  spacer: LayoutSettings;
  vertical: LayoutSettings;
};

// Helper type to get content for a specific element type
export type ContentFor<T extends ElementType> = T extends keyof ContentTypeMap
  ? ContentTypeMap[T]
  : never;

// Union of all content types
export type AnyContent = ContentTypeMap[keyof ContentTypeMap];

// Generic typed element data
export interface TypedElementData<T extends ElementType = ElementType> {
  id: string;
  type: T;
  content: ContentFor<T>;
}
