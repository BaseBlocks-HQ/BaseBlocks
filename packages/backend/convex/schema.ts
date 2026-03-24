import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { layoutSettings, layoutSlot, layoutType } from "./layouts/validators";
import { siteSettings } from "./sites/validators";

export default defineSchema({
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

  sites: defineTable({
    teamId: v.id("teams"),
    name: v.string(),
    slug: v.string(), // site slug within team
    logoUrl: v.optional(v.string()),
    logoAssetId: v.optional(v.id("assets")), // FK to assets table for cleanup on replace
    defaultPageId: v.optional(v.id("pages")),
    isPublished: v.boolean(),
    publishedAt: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Visibility
    visibility: v.optional(
      v.union(
        v.literal("private"),
        v.literal("public"),
        v.literal("link-only"),
        v.literal("password"),
      ),
    ),
    accessCodeRotationHours: v.optional(v.number()),
    accessCodeSessionDays: v.optional(v.number()),
    // Deployment tracking
    contentModifiedAt: v.optional(v.number()),
    lastDeployedAt: v.optional(v.number()),
    lastDeployedBy: v.optional(v.string()),
    deploymentVersion: v.optional(v.number()),
    // Published copies (populated on deploy)
    publishedName: v.optional(v.string()),
    publishedLogoUrl: v.optional(v.string()),
    publishedDefaultPageId: v.optional(v.id("pages")),
    publishedSettings: v.optional(siteSettings),
    settings: siteSettings,
  })
    .index("by_team", ["teamId"])
    .index("by_slug", ["teamId", "slug"]),

  siteAccessCodes: defineTable({
    siteId: v.id("sites"),
    code: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
    failedAttempts: v.optional(v.number()),
    lockedUntil: v.optional(v.number()),
  })
    .index("by_site", ["siteId"])
    .index("by_code", ["code"])
    .index("by_expiresAt", ["expiresAt"]),

  siteAccessSessions: defineTable({
    siteId: v.id("sites"),
    sessionToken: v.string(),
    verifiedAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_site_token", ["siteId", "sessionToken"])
    .index("by_expiresAt", ["expiresAt"]),

  pages: defineTable({
    siteId: v.id("sites"),
    parentId: v.optional(v.id("pages")),
    title: v.string(),
    slug: v.string(),
    icon: v.optional(v.string()),
    order: v.number(),
    isPublished: v.boolean(),
    isSubpageContent: v.optional(v.boolean()),
    pageTabs: v.optional(
      v.array(
        v.object({
          id: v.string(),
          label: v.string(),
        }),
      ),
    ),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Published copies (populated on deploy)
    publishedTitle: v.optional(v.string()),
    publishedSlug: v.optional(v.string()),
    publishedIcon: v.optional(v.string()),
    publishedOrder: v.optional(v.number()),
    publishedParentId: v.optional(v.id("pages")),
    publishedPageTabs: v.optional(
      v.array(
        v.object({
          id: v.string(),
          label: v.string(),
        }),
      ),
    ),
    isDeployed: v.optional(v.boolean()),
  })
    .index("by_site", ["siteId"])
    .index("by_parent", ["siteId", "parentId"])
    .index("by_slug", ["siteId", "slug"]),

  layouts: defineTable({
    siteId: v.optional(v.id("sites")), // Denormalized for efficient site-wide queries
    pageId: v.id("pages"),
    tabId: v.optional(v.string()),
    type: layoutType,
    order: v.number(),
    // Draft slots (what editor sees/edits)
    slots: v.array(layoutSlot),
    // Published slots (what public site sees, populated on deploy)
    publishedSlots: v.optional(v.array(layoutSlot)),
    // Layout settings
    settings: layoutSettings,
    // Published copies of layout structure (populated on deploy)
    publishedType: v.optional(layoutType),
    publishedOrder: v.optional(v.number()),
    publishedSettings: v.optional(layoutSettings),
    publishedTabId: v.optional(v.string()),
    isDeployed: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_page", ["pageId"])
    .index("by_page_tab", ["pageId", "tabId"]),

  documentLibraries: defineTable({
    siteId: v.id("sites"),
    name: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_site", ["siteId"]),

  documentFolders: defineTable({
    libraryId: v.id("documentLibraries"),
    parentId: v.optional(v.id("documentFolders")),
    name: v.string(),
    order: v.number(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_library", ["libraryId"])
    .index("by_parent", ["libraryId", "parentId"]),

  assets: defineTable({
    siteId: v.id("sites"),
    kind: v.union(v.literal("document"), v.literal("siteAsset")),
    visibility: v.union(v.literal("public"), v.literal("private")),
    provider: v.literal("s3"),
    bucket: v.string(),
    objectKey: v.string(),
    filename: v.optional(v.string()),
    contentType: v.string(),
    size: v.number(),
    checksum: v.optional(v.string()),
    uploadedBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_site_kind", ["siteId", "kind"])
    .index("by_object", ["provider", "bucket", "objectKey"]),

  documents: defineTable({
    siteId: v.id("sites"),
    libraryId: v.optional(v.id("documentLibraries")),
    folderId: v.optional(v.id("documentFolders")),
    assetId: v.optional(v.id("assets")),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
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

  searchableContent: defineTable({
    siteId: v.id("sites"),
    contentType: v.union(v.literal("document"), v.literal("subpage")),
    sourceId: v.string(),
    title: v.string(),
    extractedText: v.string(),
    metadata: v.object({
      filename: v.optional(v.string()),
      fileContentType: v.optional(v.string()),
      size: v.optional(v.number()),
      downloadUrl: v.optional(v.string()),
      libraryId: v.optional(v.string()),
      assetId: v.optional(v.id("assets")),
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
  // data is polymorphic by chunkType: site-settings stores settings object,
  // page-tree stores page array, page-layouts stores layout array.
  // Typed at the query/mutation layer, not at schema level.
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

  members: defineTable({
    teamId: v.id("teams"),
    userId: v.string(),
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
