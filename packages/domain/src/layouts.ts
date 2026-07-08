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
  | "file"
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

export type CreateId = () => string;

export function getLayoutSlotCount(
  type: LayoutType,
  settings: LayoutSettings = DEFAULT_LAYOUT_SETTINGS[type],
): number {
  switch (type) {
    case "single":
    case "vertical":
      return 1;
    case "rows":
      return settings.rowCount ?? DEFAULT_LAYOUT_SETTINGS.rows.rowCount ?? 2;
    case "columns":
      return (
        settings.columnCount ?? DEFAULT_LAYOUT_SETTINGS.columns.columnCount ?? 2
      );
    case "grid":
      return (
        (settings.gridColumns ??
          DEFAULT_LAYOUT_SETTINGS.grid.gridColumns ??
          2) *
        (settings.gridRows ?? DEFAULT_LAYOUT_SETTINGS.grid.gridRows ?? 2)
      );
    case "spacer":
      return 0;
  }
}

export function createLayoutSlots(
  type: LayoutType,
  settings: LayoutSettings,
  createId: CreateId,
): LayoutSlot[] {
  return Array.from(
    { length: getLayoutSlotCount(type, settings) },
    (_, position) => ({
      id: createId(),
      position,
      blocks: [],
    }),
  );
}

export function createLayoutDraft({
  createId,
  order = 0,
  settingsOverrides,
  tabId,
  type,
}: {
  createId: CreateId;
  order?: number;
  settingsOverrides?: Partial<LayoutSettings>;
  tabId?: string;
  type: LayoutType;
}): LayoutData {
  const settings = {
    ...DEFAULT_LAYOUT_SETTINGS[type],
    ...settingsOverrides,
  };

  return {
    id: createId(),
    type,
    slots: createLayoutSlots(type, settings, createId),
    settings,
    order,
    tabId,
  };
}

export function createBlockDraft(
  type: LayoutBlockType,
  content: AnyContent,
  createId: CreateId,
): LayoutBlockData {
  return {
    id: createId(),
    type,
    content,
  };
}
