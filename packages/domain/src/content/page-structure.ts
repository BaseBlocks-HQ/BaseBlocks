import type { AnyContent, ElementType } from "./elements";

export type SectionRegion = "main" | "aside";
export type SectionPreset = "single" | "columns" | "aside";

export interface PageTab {
  id: string;
  label: string;
}

export interface BlockData {
  id: string;
  type: ElementType;
  content: AnyContent;
  order: number;
}

export interface ColumnData {
  id: string;
  order: number;
  blocks: BlockData[];
}

export interface SectionData {
  id: string;
  tabId?: string;
  region: SectionRegion;
  order: number;
  columns: ColumnData[];
}

/** The sole portable representation of a page's composition. */
export interface PageStructure {
  tabs: PageTab[];
  sections: SectionData[];
}

export function createBlockDraft(
  type: ElementType,
  content: AnyContent,
  createId: () => string,
): BlockData {
  return { id: createId(), type, content, order: 0 };
}

export function createEmptyPageStructure(
  createId: () => string,
): PageStructure {
  return {
    tabs: [],
    sections: [
      {
        id: createId(),
        region: "main",
        order: 0,
        columns: [{ id: createId(), order: 0, blocks: [] }],
      },
    ],
  };
}
