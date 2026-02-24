import type { AnyContent } from "./elements";

export type LayoutType =
  | "single" // Single column, full width
  | "rows" // Vertical stack of N rows
  | "columns" // Horizontal N columns
  | "grid" // N×M grid
  | "spacer" // Vertical spacer (no slots)
  | "vertical"; // Sidebar layout (rendered beside main content)

export type LayoutBlockType =
  | "heading"
  | "paragraph"
  | "image"
  | "library"
  | "search"
  | "divider"
  | "block-spacer"
  | "callout"
  | "code"
  | "quicklinks";

export interface LayoutBlockData {
  id: string;
  type: LayoutBlockType;
  content: AnyContent;
}

export interface LayoutSlot {
  id: string;
  position: number; // Order within layout (0-indexed)
  blocks: LayoutBlockData[];
}

export type SpacerLayoutHeight = "small" | "medium" | "large" | "xlarge";

export interface LayoutSettings {
  rowCount?: number; // For "rows" layout (2-4)
  columnCount?: number; // For "columns" layout (2-4)
  gridColumns?: number; // For "grid" layout (2-4)
  gridRows?: number; // For "grid" layout (2-4)
  spacerHeight?: SpacerLayoutHeight; // For "spacer" layout
}

export interface LayoutData {
  id: string;
  type: LayoutType;
  slots: LayoutSlot[];
  settings: LayoutSettings;
  order: number; // Position on page
  tabId?: string; // Which page tab this layout belongs to
}

export interface PageTab {
  id: string;
  label: string;
}

export const LAYOUT_SLOT_COUNTS: Record<LayoutType, number | "dynamic"> = {
  single: 1,
  rows: "dynamic", // Based on rowCount setting
  columns: "dynamic", // Based on columnCount setting
  grid: "dynamic", // Based on gridColumns × gridRows
  spacer: 0, // Spacer has no slots
  vertical: 1, // Sidebar layout (single slot, rendered beside main content)
};

export const DEFAULT_LAYOUT_SETTINGS: Record<LayoutType, LayoutSettings> = {
  single: {},
  rows: { rowCount: 2 },
  columns: { columnCount: 2 },
  grid: { gridColumns: 2, gridRows: 2 },
  spacer: { spacerHeight: "medium" },
  vertical: {}, // Sidebar layout - no special settings
};

export interface LayoutTypeInfo {
  type: LayoutType;
  label: string;
  description: string;
  icon: string; // Lucide icon name
}

export const LAYOUT_TYPES: LayoutTypeInfo[] = [
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
  {
    type: "vertical",
    label: "Sidebar",
    description: "Sidebar beside main content",
    icon: "PanelRight",
  },
  {
    type: "spacer",
    label: "Spacer",
    description: "Vertical spacing",
    icon: "MoveVertical",
  },
];
