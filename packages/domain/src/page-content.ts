import type { AnyContent, ElementType } from "./elements";

export type PageBlockType = ElementType | "columns" | "tabs" | "spacer";

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

export interface ColumnsPageBlock extends BasePageBlock<"columns"> {
  columns: PageBlockColumn[];
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
  | ColumnsPageBlock
  | TabsPageBlock
  | SpacerPageBlock;

export interface PageContent {
  blocks: PageBlock[];
}

export const EMPTY_PAGE_CONTENT: PageContent = {
  blocks: [],
};
