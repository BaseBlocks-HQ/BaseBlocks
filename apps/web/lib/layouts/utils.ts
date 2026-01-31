import type {
  AnyContent,
  LayoutBlockData,
  LayoutBlockType,
  LayoutData,
  LayoutSettings,
  LayoutSlot,
  LayoutType,
} from "@/types";
import { DEFAULT_LAYOUT_SETTINGS } from "@/types";
/**
 * Layout utility functions for creating and manipulating layouts
 */
import { nanoid } from "nanoid";

/**
 * Generate a unique ID for layouts, slots, or blocks
 */
export function generateId(): string {
  return nanoid(10);
}

/**
 * Get the number of slots for a layout based on its type and settings
 */
export function getSlotCount(
  type: LayoutType,
  settings: LayoutSettings,
): number {
  switch (type) {
    case "single":
      return 1;
    case "rows":
      return settings.rowCount ?? 2;
    case "columns":
      return settings.columnCount ?? 2;
    case "grid":
      return (settings.gridColumns ?? 2) * (settings.gridRows ?? 2);
    case "spacer":
      return 0; // Spacer has no slots
    case "vertical":
      return 1; // Sidebar layout (single slot)
    default:
      return 1;
  }
}

/**
 * Create empty slots for a layout
 */
export function createSlots(count: number): LayoutSlot[] {
  return Array.from({ length: count }, (_, i) => ({
    id: generateId(),
    position: i,
    blocks: [],
  }));
}

/**
 * Create a new layout with default settings
 */
export function createLayout(
  type: LayoutType,
  settingsOverrides?: Partial<LayoutSettings>,
): Omit<LayoutData, "order"> {
  const settings = {
    ...DEFAULT_LAYOUT_SETTINGS[type],
    ...settingsOverrides,
  };
  const slotCount = getSlotCount(type, settings);

  return {
    id: generateId(),
    type,
    slots: createSlots(slotCount),
    settings,
  };
}

/**
 * Create a new block
 */
export function createBlock(
  type: LayoutBlockType,
  content: AnyContent,
): LayoutBlockData {
  return {
    id: generateId(),
    type,
    content,
  };
}

// Spacer height values in pixels
export const SPACER_LAYOUT_HEIGHTS = {
  small: 32,
  medium: 64,
  large: 96,
  xlarge: 128,
} as const;

/**
 * Get CSS grid template for layout
 */
export function getLayoutGridStyle(
  type: LayoutType,
  settings: LayoutSettings,
): React.CSSProperties {
  switch (type) {
    case "single":
      return { display: "block" };
    case "rows":
      return {
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      };
    case "columns":
      return {
        display: "grid",
        gridTemplateColumns: `repeat(${settings.columnCount ?? 2}, minmax(0, 1fr))`,
        gap: "1.5rem",
      };
    case "grid":
      return {
        display: "grid",
        gridTemplateColumns: `repeat(${settings.gridColumns ?? 2}, minmax(0, 1fr))`,
        gap: "1rem",
      };
    case "vertical":
      return { display: "block" }; // Sidebar layout - single column
    case "spacer":
      return { display: "block" }; // Spacer is just a block element
    default:
      return { display: "block" };
  }
}
