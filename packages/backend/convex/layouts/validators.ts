import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Layout validators — block types, slots, and layout configuration
// ---------------------------------------------------------------------------

/** All block types supported in layout slots */
export const blockType = v.union(
  v.literal("heading"),
  v.literal("paragraph"),
  v.literal("image"),
  v.literal("file"),
  v.literal("document-list"),
  v.literal("library"),
  v.literal("search"),
  v.literal("embed"),
  v.literal("divider"),
  v.literal("block-spacer"),
  v.literal("callout"),
  v.literal("code"),
  v.literal("table"),
  v.literal("quicklinks"),
  v.literal("form"),
  v.literal("richtext"),
  v.literal("subpage"),
  v.literal("banner"),
  v.literal("directory"),
  v.literal("flowchart"),
  v.literal("decision-tree"),
);

/**
 * Block content validator.
 *
 * Content is polymorphic per block type (heading has {text, level}, image has
 * {url, alt, caption, ...}, form has {fields, submitLabel, ...}, etc.).
 * A full discriminated union for 20+ block types would be massive and brittle.
 * Content shape validation happens at the TypeScript/frontend layer via
 * @baseblocks/types/elements. The schema intentionally uses v.any() here.
 */
export const blockContent = v.any();

/** A single block within a slot */
export const slotBlock = v.object({
  id: v.string(),
  type: blockType,
  content: blockContent,
});

/** A slot within a layout (contains positioned blocks) */
export const layoutSlot = v.object({
  id: v.string(),
  position: v.number(),
  blocks: v.array(slotBlock),
});

/** All layout container types */
export const layoutType = v.union(
  v.literal("single"),
  v.literal("rows"),
  v.literal("columns"),
  v.literal("grid"),
  v.literal("spacer"),
  v.literal("vertical"),
);

/** Layout settings (grid/row/column/spacer configuration) */
export const layoutSettings = v.object({
  rowCount: v.optional(v.number()),
  columnCount: v.optional(v.number()),
  gridColumns: v.optional(v.number()),
  gridRows: v.optional(v.number()),
  spacerHeight: v.optional(
    v.union(
      v.literal("small"),
      v.literal("medium"),
      v.literal("large"),
      v.literal("xlarge"),
    ),
  ),
});
