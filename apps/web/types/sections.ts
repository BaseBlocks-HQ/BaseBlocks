/**
 * Section type definitions for the editor and renderer
 * Sections are layout containers that hold blocks in organized slots
 */
import type { BlockContent, BlockType } from "./blocks";

// Section layout types
export type SectionLayout =
  | "single" // Single column, full width
  | "rows" // Vertical stack of N rows
  | "columns" // Horizontal N columns
  | "grid"; // N×M grid

// Block data as stored within a section slot
export interface SectionBlockData {
  id: string;
  type: BlockType;
  content: BlockContent;
}

// A slot is a drop zone within a section
export interface SectionSlot {
  id: string;
  position: number; // Order within section (0-indexed)
  blocks: SectionBlockData[];
}

// Section settings - simplified (just layout config)
export interface SectionSettings {
  // Layout configuration (depends on section type)
  rowCount?: number; // For "rows" layout (2-4)
  columnCount?: number; // For "columns" layout (2-4)
  gridColumns?: number; // For "grid" layout (2-4)
  gridRows?: number; // For "grid" layout (2-4)
}

// Complete section data structure
export interface SectionData {
  id: string;
  type: SectionLayout;
  slots: SectionSlot[];
  settings: SectionSettings;
  order: number; // Position on page
}

// Default slot counts per layout type
export const LAYOUT_SLOT_COUNTS: Record<SectionLayout, number | "dynamic"> = {
  single: 1,
  rows: "dynamic", // Based on rowCount setting
  columns: "dynamic", // Based on columnCount setting
  grid: "dynamic", // Based on gridColumns × gridRows
};

// Default settings per layout type
export const DEFAULT_SECTION_SETTINGS: Record<SectionLayout, SectionSettings> =
  {
    single: {},
    rows: { rowCount: 2 },
    columns: { columnCount: 2 },
    grid: { gridColumns: 2, gridRows: 2 },
  };

// Section metadata for UI display
export interface SectionTypeInfo {
  type: SectionLayout;
  label: string;
  description: string;
  icon: string; // Lucide icon name
}

export const SECTION_TYPES: SectionTypeInfo[] = [
  {
    type: "single",
    label: "Single",
    description: "Full-width single column",
    icon: "Square",
  },
  {
    type: "rows",
    label: "Rows",
    description: "Vertical stack of rows",
    icon: "Rows3",
  },
  {
    type: "columns",
    label: "Columns",
    description: "Horizontal columns",
    icon: "Columns3",
  },
  {
    type: "grid",
    label: "Grid",
    description: "Grid layout",
    icon: "LayoutGrid",
  },
];
