import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Site validators — customization and settings
// ---------------------------------------------------------------------------

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
