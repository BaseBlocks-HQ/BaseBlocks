import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Shared validators — single source of truth for schema + mutations
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

/** Site customization theme options */
export const siteCustomization = v.object({
  accentColor: v.optional(v.string()),
  accentColorDark: v.optional(v.string()),
  headerColor: v.optional(v.string()),
  headerColorDark: v.optional(v.string()),
  secondaryColor: v.optional(v.string()),
  secondaryColorDark: v.optional(v.string()),
  tertiaryColor: v.optional(v.string()),
  tertiaryColorDark: v.optional(v.string()),
  showHeaderGradient: v.optional(v.boolean()),
  borderRadius: v.optional(
    v.union(
      v.literal("none"),
      v.literal("small"),
      v.literal("medium"),
      v.literal("large"),
      v.literal("full"),
    ),
  ),
});

/** Site settings (navigation, header, SEO, customization) */
export const siteSettings = v.object({
  favicon: v.optional(v.string()),
  ogImage: v.optional(v.string()),
  siteTitle: v.optional(v.string()),
  siteDescription: v.optional(v.string()),
  siteKeywords: v.optional(v.string()),
  headerType: v.union(v.literal("logo"), v.literal("text")),
  navigationStyle: v.union(
    v.literal("sidebar"),
    v.literal("topnav"),
    v.literal("subnav"),
  ),
  showHeader: v.optional(v.boolean()),
  showLogo: v.optional(v.boolean()),
  showSiteName: v.optional(v.boolean()),
  showHeaderSearch: v.optional(v.boolean()),
  showBreadcrumbs: v.optional(v.boolean()),
  sidebarDefaultExpanded: v.optional(v.boolean()),
  customization: v.optional(siteCustomization),
});
