import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Teams
  teams: defineTable({
    organizationId: v.optional(v.string()), // Better Auth organization ID
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
    .index("by_organizationId", ["organizationId"]),

  // Sites (a team can have multiple sites)
  sites: defineTable({
    teamId: v.id("teams"),
    name: v.string(),
    slug: v.string(), // site slug within team
    logoUrl: v.optional(v.string()), // Custom logo for the site
    defaultPageId: v.optional(v.id("pages")), // The page shown first when visiting
    isPublished: v.boolean(),
    publishedAt: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Visibility settings for sharing
    visibility: v.optional(
      v.union(
        v.literal("private"), // Only admins/members
        v.literal("public"), // Anyone
        v.literal("link-only"), // Unlisted - direct link only
        v.literal("password") // Requires access code
      )
    ),
    accessCodeRotationHours: v.optional(v.number()), // For auto-rotation (default: 24)
    accessCodeSessionDays: v.optional(v.number()), // How long sessions last (default: 7)
    // Deploy tracking (legacy field kept for migration compatibility)
    hasUndeployedChanges: v.optional(v.boolean()),
    // New deployment tracking
    contentModifiedAt: v.optional(v.number()), // Auto-set by backend mutations
    lastDeployedAt: v.optional(v.number()),
    lastDeployedBy: v.optional(v.string()),
    deploymentVersion: v.optional(v.number()),
    // Published copies of settings (populated on deploy)
    publishedName: v.optional(v.string()),
    publishedLogoUrl: v.optional(v.string()),
    publishedDefaultPageId: v.optional(v.id("pages")),
    publishedSettings: v.optional(v.any()),
    settings: v.object({
      favicon: v.optional(v.string()),
      ogImage: v.optional(v.string()),
      siteTitle: v.optional(v.string()),
      siteDescription: v.optional(v.string()),
      siteKeywords: v.optional(v.string()),
      headerType: v.union(v.literal("logo"), v.literal("text")),
      navigationStyle: v.union(
        v.literal("sidebar"),
        v.literal("topnav"),
        v.literal("subnav")
      ),
      // Header visibility settings
      showHeader: v.optional(v.boolean()), // default: true
      showLogo: v.optional(v.boolean()), // default: true
      showSiteName: v.optional(v.boolean()), // default: true
      showHeaderSearch: v.optional(v.boolean()), // default: false
      showBreadcrumbs: v.optional(v.boolean()), // default: true (or hidden for sidebar when unset)
      sidebarDefaultExpanded: v.optional(v.boolean()), // default: false
      // Site customization
      customization: v.optional(v.object({
        accentColor: v.optional(v.string()), // Hex color
        accentColorDark: v.optional(v.string()), // Optional dark mode variant
        headerColor: v.optional(v.string()), // Header background color
        headerColorDark: v.optional(v.string()), // Header dark mode variant
        secondaryColor: v.optional(v.string()), // Accent/gradient secondary color
        secondaryColorDark: v.optional(v.string()), // Secondary dark mode variant
        tertiaryColor: v.optional(v.string()), // Third gradient color
        tertiaryColorDark: v.optional(v.string()), // Third dark mode variant
        showHeaderGradient: v.optional(v.boolean()), // Gradient stripe under header
        borderRadius: v.optional(v.union(
          v.literal("none"),
          v.literal("small"),
          v.literal("medium"),
          v.literal("large"),
          v.literal("full"),
        )),
      })),
    }),
  })
    .index("by_team", ["teamId"])
    .index("by_slug", ["teamId", "slug"]),

  // Access codes for password-protected sites
  siteAccessCodes: defineTable({
    siteId: v.id("sites"),
    code: v.string(), // 6-char alphanumeric (e.g., "ABC123")
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_code", ["code"]),

  // Sessions for visitors who have verified access codes
  siteAccessSessions: defineTable({
    siteId: v.id("sites"),
    sessionToken: v.string(),
    verifiedAt: v.number(),
    expiresAt: v.number(),
  }).index("by_site_token", ["siteId", "sessionToken"]),

  // Pages within a site
  pages: defineTable({
    siteId: v.id("sites"),
    parentId: v.optional(v.id("pages")), // For nested pages
    title: v.string(),
    slug: v.string(),
    icon: v.optional(v.string()),
    order: v.number(),
    isPublished: v.boolean(),
    // Page-level tabs: each tab gets its own set of layouts
    pageTabs: v.optional(v.array(v.object({
      id: v.string(),
      label: v.string(),
    }))),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Published copies (populated on deploy)
    publishedTitle: v.optional(v.string()),
    publishedSlug: v.optional(v.string()),
    publishedIcon: v.optional(v.string()),
    publishedOrder: v.optional(v.number()),
    publishedParentId: v.optional(v.id("pages")),
    publishedPageTabs: v.optional(v.array(v.object({
      id: v.string(),
      label: v.string(),
    }))),
    isDeployed: v.optional(v.boolean()),
  })
    .index("by_site", ["siteId"])
    .index("by_parent", ["siteId", "parentId"])
    .index("by_slug", ["siteId", "slug"]),

  // Blocks within a page (content) - DEPRECATED: Use layouts instead
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
      v.literal("form"),
      v.literal("subpage"),
      v.literal("banner"),
      v.literal("directory"),
      v.literal("flowchart"),
      v.literal("decision-tree"),
    ),
    order: v.number(),
    content: v.any(), // Block-specific content
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_page", ["pageId"]),

  // Layouts - layout containers for blocks (holds single, rows, columns, grid, spacer, vertical)
  layouts: defineTable({
    pageId: v.id("pages"),
    tabId: v.optional(v.string()), // Which page tab this layout belongs to (null = default/no tabs)
    type: v.union(
      v.literal("single"),
      v.literal("rows"),
      v.literal("columns"),
      v.literal("grid"),
      v.literal("spacer"),
      v.literal("vertical"),
    ),
    order: v.number(),
    // Slots contain the blocks - stored as embedded JSON for atomic updates
    // This is the DRAFT version (what editor sees/edits)
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
            ),
            content: v.any(),
          }),
        ),
      }),
    ),
    // Published slots - the LIVE version (what public site sees)
    // This is populated when user clicks Deploy
    publishedSlots: v.optional(v.array(
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
            ),
            content: v.any(),
          }),
        ),
      }),
    )),
    // Layout settings - layout configuration only
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
          v.literal("xlarge"),
        ),
      ),
    }),
    // Published copies of layout structure (populated on deploy)
    publishedType: v.optional(v.union(
      v.literal("single"),
      v.literal("rows"),
      v.literal("columns"),
      v.literal("grid"),
      v.literal("spacer"),
      v.literal("vertical"),
    )),
    publishedOrder: v.optional(v.number()),
    publishedSettings: v.optional(v.any()),
    publishedTabId: v.optional(v.string()),
    isDeployed: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_page", ["pageId"])
    .index("by_page_tab", ["pageId", "tabId"]),

  // Libraries - organized file repositories
  documentLibraries: defineTable({
    siteId: v.id("sites"),
    name: v.string(),
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
        v.literal("unsupported"),
      ),
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

  // Unified searchable content index (documents + subpages)
  searchableContent: defineTable({
    siteId: v.id("sites"),
    contentType: v.union(v.literal("document"), v.literal("subpage")),
    // Reference to source - for documents: document._id, for subpages: "layoutId:slotId:blockId"
    sourceId: v.string(),
    // Searchable fields
    title: v.string(),
    extractedText: v.string(),
    // Metadata for display and navigation
    metadata: v.object({
      // For documents
      filename: v.optional(v.string()),
      fileContentType: v.optional(v.string()),
      size: v.optional(v.number()),
      cdnUrl: v.optional(v.string()),
      libraryId: v.optional(v.string()),
      // For subpages
      pageId: v.optional(v.id("pages")),
      layoutId: v.optional(v.id("layouts")),
      blockId: v.optional(v.string()),
      slotId: v.optional(v.string()),
      description: v.optional(v.string()),
    }),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_source", ["contentType", "sourceId"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["siteId", "contentType"],
    })
    .searchIndex("search_content", {
      searchField: "extractedText",
      filterFields: ["siteId", "contentType"],
    }),

  // Deployment history
  deployments: defineTable({
    siteId: v.id("sites"),
    version: v.number(),
    deployedBy: v.string(),
    deployedAt: v.number(),
    notes: v.optional(v.string()),
    summary: v.object({
      pagesDeployed: v.number(),
      layoutsDeployed: v.number(),
      settingsChanged: v.boolean(),
    }),
    status: v.union(
      v.literal("active"),
      v.literal("superseded"),
      v.literal("rolled-back"),
    ),
  })
    .index("by_site", ["siteId"])
    .index("by_site_version", ["siteId", "version"])
    .index("by_site_status", ["siteId", "status"]),

  // Deployment snapshots (chunked for 1MB limit)
  deploymentSnapshots: defineTable({
    deploymentId: v.id("deployments"),
    siteId: v.id("sites"),
    chunkType: v.union(
      v.literal("site-settings"),
      v.literal("page-tree"),
      v.literal("page-layouts"),
    ),
    pageId: v.optional(v.id("pages")),
    data: v.any(),
  })
    .index("by_deployment", ["deploymentId"])
    .index("by_deployment_type", ["deploymentId", "chunkType"]),

  // Team members
  members: defineTable({
    teamId: v.id("teams"),
    userId: v.string(), // Better Auth user ID
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("viewer")),
    joinedAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_team_user", ["teamId", "userId"])
    .index("by_user", ["userId"]),
});
