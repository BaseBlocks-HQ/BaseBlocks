import type { PageListItem } from "@baseblocks/domain";

export interface FlattenedPage {
  id: string;
  parentId: string | null;
  depth: number;
  page: PageListItem;
}

export interface TreeProjection {
  parentId: string | null;
  depth: number;
  overId: string;
  position: "before" | "after" | "child";
  order: number;
}

/** Drop zone determined by cursor Y position relative to the hovered item. */
export type DropZone = "before" | "after" | "inside";
