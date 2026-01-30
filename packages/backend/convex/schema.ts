import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Companies/Organizations (synced from Entity Auth)
  companies: defineTable({
    eaOrgId: v.string(), // Entity Auth org ID
    name: v.string(),
    slug: v.string(), // subdomain: acme.baseblocks.dev
    logoUrl: v.optional(v.string()),
    createdBy: v.string(), // User ID
    createdAt: v.number(),
    settings: v.object({
      primaryColor: v.optional(v.string()),
      customDomain: v.optional(v.string()), // docs.acme.com
    }),
  })
    .index("by_slug", ["slug"])
    .index("by_eaOrgId", ["eaOrgId"]),

  // Sites (a company can have multiple sites)
  sites: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    slug: v.string(), // site slug within company
    description: v.optional(v.string()),
    defaultPageId: v.optional(v.id("pages")), // The page shown first when visiting
    isPublished: v.boolean(),
    publishedAt: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    settings: v.object({
      favicon: v.optional(v.string()),
      ogImage: v.optional(v.string()),
      headerType: v.union(v.literal("logo"), v.literal("text")),
      navigationStyle: v.union(v.literal("sidebar"), v.literal("topnav")),
    }),
  })
    .index("by_company", ["companyId"])
    .index("by_slug", ["companyId", "slug"]),

  // Pages within a site
  pages: defineTable({
    siteId: v.id("sites"),
    parentId: v.optional(v.id("pages")), // For nested pages
    title: v.string(),
    slug: v.string(),
    icon: v.optional(v.string()),
    order: v.number(),
    isPublished: v.boolean(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_parent", ["siteId", "parentId"])
    .index("by_slug", ["siteId", "slug"]),

  // Blocks within a page (content) - DEPRECATED: Use sections instead
  blocks: defineTable({
    pageId: v.id("pages"),
    type: v.union(
      v.literal("heading"),
      v.literal("paragraph"),
      v.literal("image"),
      v.literal("file"),
      v.literal("document-list"),
      v.literal("library"),
      v.literal("search"),
      v.literal("embed"),
      v.literal("divider"),
      v.literal("spacer"),
      v.literal("callout"),
      v.literal("code"),
      v.literal("table"),
      v.literal("quicklinks"),
    ),
    order: v.number(),
    content: v.any(), // Block-specific content
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_page", ["pageId"]),

  // Sections - layout containers for blocks
  sections: defineTable({
    pageId: v.id("pages"),
    type: v.union(
      v.literal("single"),
      v.literal("rows"),
      v.literal("columns"),
      v.literal("grid"),
      v.literal("spacer")
    ),
    order: v.number(),
    // Slots contain the blocks - stored as embedded JSON for atomic updates
    slots: v.array(
      v.object({
        id: v.string(),
        position: v.number(),
        blocks: v.array(
          v.object({
            id: v.string(),
            type: v.union(
              v.literal("heading"),
              v.literal("paragraph"),
              v.literal("image"),
              v.literal("file"),
              v.literal("document-list"),
              v.literal("library"),
              v.literal("search"),
              v.literal("embed"),
              v.literal("divider"),
              v.literal("spacer"),
              v.literal("callout"),
              v.literal("code"),
              v.literal("table"),
              v.literal("quicklinks")
            ),
            content: v.any(),
          })
        ),
      })
    ),
    // Section settings - layout configuration only
    settings: v.object({
      rowCount: v.optional(v.number()),
      columnCount: v.optional(v.number()),
      gridColumns: v.optional(v.number()),
      gridRows: v.optional(v.number()),
      spacerHeight: v.optional(
        v.union(
          v.literal("small"),
          v.literal("medium"),
          v.literal("large"),
          v.literal("xlarge")
        )
      ),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_page", ["pageId"]),

  // Libraryries - organized file repositories
  documentLibraries: defineTable({
    siteId: v.id("sites"),
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_site", ["siteId"]),

  // Folder hierarchy within libraries
  documentFolders: defineTable({
    libraryId: v.id("documentLibraries"),
    parentId: v.optional(v.id("documentFolders")), // null = root level
    name: v.string(),
    order: v.number(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_library", ["libraryId"])
    .index("by_parent", ["libraryId", "parentId"]),

  // Files/Documents uploaded
  documents: defineTable({
    siteId: v.id("sites"),
    // Library organization (optional - for library blocks)
    libraryId: v.optional(v.id("documentLibraries")),
    folderId: v.optional(v.id("documentFolders")), // null = root of library
    blobId: v.string(), // Entity Storage blob ID
    cdnUrl: v.string(), // CDN URL for download
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
    // Text extraction
    extractedText: v.optional(v.string()),
    pageCount: v.optional(v.number()),
    wordCount: v.optional(v.number()),
    extractionStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("unsupported")
      )
    ),
    extractionError: v.optional(v.string()),
    // Tracking
    uploadedBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_library", ["libraryId"])
    .index("by_folder", ["libraryId", "folderId"])
    .index("by_extraction_status", ["siteId", "extractionStatus"])
    .searchIndex("search_content", {
      searchField: "extractedText",
      filterFields: ["siteId"],
    })
    .searchIndex("search_filename", {
      searchField: "filename",
      filterFields: ["siteId"],
    }),

  // Access links for sharing
  accessLinks: defineTable({
    siteId: v.id("sites"),
    token: v.string(), // Unique access token
    name: v.optional(v.string()), // "Marketing Team Link"
    expiresAt: v.optional(v.number()),
    maxUses: v.optional(v.number()),
    useCount: v.number(),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_token", ["token"]),

  // Audit log for access
  accessLog: defineTable({
    siteId: v.id("sites"),
    accessLinkId: v.optional(v.id("accessLinks")),
    pageId: v.optional(v.id("pages")),
    documentId: v.optional(v.id("documents")),
    action: v.union(
      v.literal("view_site"),
      v.literal("view_page"),
      v.literal("download_document"),
    ),
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_timestamp", ["siteId", "timestamp"]),
});
