import type {
  BlockContent,
  BlockType,
  SectionBlockData,
  SectionData,
  SectionLayout,
  SectionSettings,
  SectionSlot,
} from "@/types";
import { DEFAULT_SECTION_SETTINGS } from "@/types";
/**
 * Section utility functions for creating and manipulating sections
 */
import { nanoid } from "nanoid";

/**
 * Generate a unique ID for sections, slots, or blocks
 */
export function generateId(): string {
  return nanoid(10);
}

/**
 * Get the number of slots for a section based on its type and settings
 */
export function getSlotCount(
  type: SectionLayout,
  settings: SectionSettings,
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
    default:
      return 1;
  }
}

/**
 * Create empty slots for a section
 */
export function createSlots(count: number): SectionSlot[] {
  return Array.from({ length: count }, (_, i) => ({
    id: generateId(),
    position: i,
    blocks: [],
  }));
}

/**
 * Create a new section with default settings
 */
export function createSection(
  type: SectionLayout,
  settingsOverrides?: Partial<SectionSettings>,
): Omit<SectionData, "order"> {
  const settings = {
    ...DEFAULT_SECTION_SETTINGS[type],
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
  type: BlockType,
  content: BlockContent,
): SectionBlockData {
  return {
    id: generateId(),
    type,
    content,
  };
}

/**
 * Get CSS grid template for section layout
 */
export function getSectionGridStyle(
  type: SectionLayout,
  settings: SectionSettings,
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
        gridTemplateColumns: `repeat(${settings.columnCount ?? 2}, 1fr)`,
        gap: "1.5rem",
      };
    case "grid":
      return {
        display: "grid",
        gridTemplateColumns: `repeat(${settings.gridColumns ?? 2}, 1fr)`,
        gap: "1rem",
      };
    default:
      return { display: "block" };
  }
}
