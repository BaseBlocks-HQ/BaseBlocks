import type { AnyContent, ElementType } from "./elements";

export type SectionRegion = "main" | "aside";
export type SectionPreset = "single" | "columns" | "aside";

export interface SectionData {
  id: string;
  tabId?: string;
  region: SectionRegion;
  order: number;
}

export interface ColumnData {
  id: string;
  sectionId: string;
  order: number;
}

export interface BlockData {
  id: string;
  sectionId: string;
  columnId: string;
  order: number;
  type: ElementType;
  content: AnyContent;
}

export interface PageStructure {
  sections: SectionData[];
  columns: ColumnData[];
  blocks: BlockData[];
}

export interface PageTab {
  id: string;
  label: string;
}

export function createBlockDraft(
  type: ElementType,
  content: AnyContent,
  createId: () => string,
): Pick<BlockData, "id" | "type" | "content"> {
  return { id: createId(), type, content };
}
