import type { AnyContent, ElementType } from "./elements";

export type PageBlockType =
  | ElementType
  | "single"
  | "rows"
  | "columns"
  | "grid"
  | "sidebar"
  | "tabs"
  | "spacer";

export interface BasePageBlock<T extends PageBlockType = PageBlockType> {
  id: string;
  type: T;
}

export interface ElementPageBlock extends BasePageBlock<ElementType> {
  content: AnyContent;
}

export interface PageBlockColumn {
  id: string;
  blocks: PageBlock[];
}

export interface SinglePageBlock extends BasePageBlock<"single"> {
  blocks: PageBlock[];
}

export interface RowsPageBlock extends BasePageBlock<"rows"> {
  rows: PageBlockColumn[];
}

export interface ColumnsPageBlock extends BasePageBlock<"columns"> {
  columns: PageBlockColumn[];
}

export interface GridPageBlock extends BasePageBlock<"grid"> {
  columns: number;
  cells: PageBlockColumn[];
}

export interface SidebarPageBlock extends BasePageBlock<"sidebar"> {
  main: PageBlockColumn;
  aside: PageBlockColumn;
  side: "left" | "right";
}

export interface TabsPageBlock extends BasePageBlock<"tabs"> {
  tabs: Array<{
    id: string;
    label: string;
    blocks: PageBlock[];
  }>;
}

export interface SpacerPageBlock extends BasePageBlock<"spacer"> {
  size: "small" | "medium" | "large" | "xlarge";
}

export type PageBlock =
  | ElementPageBlock
  | SinglePageBlock
  | RowsPageBlock
  | ColumnsPageBlock
  | GridPageBlock
  | SidebarPageBlock
  | TabsPageBlock
  | SpacerPageBlock;

export interface PageContent {
  blocks: PageBlock[];
}

export const EMPTY_PAGE_CONTENT: PageContent = {
  blocks: [],
};
