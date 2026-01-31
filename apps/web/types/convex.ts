/**
 * Re-export Convex types for use throughout the application
 * Single source of truth - types sync automatically with schema changes
 */
import type { Doc, Id } from "@repo/backend";

// Document types
export type Company = Doc<"companies">;
export type Site = Doc<"sites">;
export type Page = Doc<"pages">;
export type Block = Doc<"blocks">;
export type Layout = Doc<"layouts">;
export type Document = Doc<"documents">;
export type AccessLink = Doc<"accessLinks">;
export type AccessLog = Doc<"accessLog">;

// ID types
export type CompanyId = Id<"companies">;
export type SiteId = Id<"sites">;
export type PageId = Id<"pages">;
export type BlockId = Id<"blocks">;
export type LayoutId = Id<"layouts">;
export type DocumentId = Id<"documents">;
export type AccessLinkId = Id<"accessLinks">;
export type AccessLogId = Id<"accessLog">;

// Re-export for direct usage
export type { Doc, Id };
