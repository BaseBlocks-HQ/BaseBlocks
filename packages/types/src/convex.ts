/**
 * Re-export Convex types for use throughout the application
 * Single source of truth - types sync automatically with schema changes
 */
import type { Doc, Id } from "@baseblocks/backend";

// Document types
export type Team = Doc<"teams">;
export type Site = Doc<"sites">;
export type Page = Doc<"pages">;
export type Layout = Doc<"layouts">;
export type Document = Doc<"documents">;

// ID types
export type TeamId = Id<"teams">;
export type SiteId = Id<"sites">;
export type PageId = Id<"pages">;
export type LayoutId = Id<"layouts">;
export type DocumentId = Id<"documents">;

// Re-export for direct usage
export type { Doc, Id };
