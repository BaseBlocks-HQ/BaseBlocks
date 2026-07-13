import { v } from "convex/values";

export const siteThemeSettings = v.object({
  palette: v.union(
    v.literal("neutral"),
    v.literal("amber"),
    v.literal("blue"),
    v.literal("green"),
    v.literal("violet"),
    v.literal("rose"),
    v.literal("custom"),
  ),
  style: v.union(
    v.literal("subtle"),
    v.literal("tinted"),
    v.literal("vibrant"),
  ),
  brandColor: v.optional(v.string()),
});

export const siteSettings = v.object({
  favicon: v.optional(v.string()),
  showLogo: v.optional(v.boolean()),
  showSiteName: v.optional(v.boolean()),
  showHeaderSearch: v.optional(v.boolean()),
  theme: v.optional(siteThemeSettings),
});
