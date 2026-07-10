import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { pageSectionValidator, pageTabValidator } from "./pageContent";
import { pageAccessPolicyValidator } from "./sharing";
import { siteSettings } from "./sites";

export default defineSchema({
  sites: defineTable({
    organizationId: v.string(),
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
    settings: siteSettings,
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_slug", ["organizationId", "slug"]),

  siteDomains: defineTable({
    siteId: v.id("sites"),
    hostname: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("misconfigured"),
    ),
    verifiedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_hostname", ["hostname"]),

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

  siteAudiences: defineTable({
    siteId: v.id("sites"),
    name: v.string(),
    createdAt: v.number(),
    createdBy: v.string(),
    updatedAt: v.number(),
  }).index("by_site_name", ["siteId", "name"]),

  siteAudienceMembers: defineTable({
    siteId: v.id("sites"),
    audienceId: v.id("siteAudiences"),
    userId: v.string(),
    addedAt: v.number(),
    addedBy: v.string(),
  })
    .index("by_audience_user", ["audienceId", "userId"])
    .index("by_site_user", ["siteId", "userId"]),

  pages: defineTable({
    siteId: v.id("sites"),
    parentId: v.optional(v.id("pages")),
    title: v.string(),
    slug: v.string(),
    icon: v.optional(v.string()),
    order: v.number(),
    showInNavigation: v.optional(v.boolean()),
    accessPolicy: v.optional(pageAccessPolicyValidator),
    // Transitional migration source; composition reads tabs from pageContents.
    pageTabs: v.optional(
      v.array(v.object({ id: v.string(), label: v.string() })),
    ),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_parent", ["siteId", "parentId"])
    .index("by_slug", ["siteId", "slug"]),

  pageContents: defineTable({
    siteId: v.id("sites"),
    pageId: v.id("pages"),
    tabs: v.array(pageTabValidator),
    sections: v.array(pageSectionValidator),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_page", ["pageId"]),

  // Transitional source tables. Remove only after the production page-content
  // migration has been verified and a fresh production backup exists.
  sections: defineTable({
    siteId: v.id("sites"),
    pageId: v.id("pages"),
    tabId: v.optional(v.string()),
    region: v.union(v.literal("main"), v.literal("aside")),
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_page", ["pageId"])
    .index("by_page_tab", ["pageId", "tabId"]),

  columns: defineTable({
    siteId: v.id("sites"),
    pageId: v.id("pages"),
    sectionId: v.id("sections"),
    order: v.number(),
    createdAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_page", ["pageId"])
    .index("by_section", ["sectionId"]),

  blocks: defineTable({
    siteId: v.id("sites"),
    pageId: v.id("pages"),
    sectionId: v.id("sections"),
    columnId: v.id("columns"),
    order: v.number(),
    type: v.union(
      v.literal("heading"),
      v.literal("paragraph"),
      v.literal("image"),
      v.literal("file"),
      v.literal("library"),
      v.literal("search"),
      v.literal("divider"),
      v.literal("spacer"),
      v.literal("callout"),
      v.literal("code"),
      v.literal("quicklinks"),
      v.literal("richtext"),
      v.literal("page"),
      v.literal("directory"),
      v.literal("flowchart"),
      v.literal("decision-tree"),
    ),
    content: v.any(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_page", ["pageId"])
    .index("by_section", ["sectionId"])
    .index("by_column", ["columnId", "order"]),

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
  }).index("by_parent", ["libraryId", "parentId"]),

  assets: defineTable({
    siteId: v.id("sites"),
    kind: v.union(v.literal("document"), v.literal("siteAsset")),
    visibility: v.union(v.literal("public"), v.literal("private")),
    provider: v.string(),
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
    uploadedBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_folder", ["libraryId", "folderId"])
    .searchIndex("search_filename", {
      searchField: "filename",
      filterFields: ["siteId"],
    }),

  searchableContent: defineTable({
    siteId: v.id("sites"),
    contentType: v.union(v.literal("document"), v.literal("page")),
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
      sectionId: v.optional(v.string()),
      blockId: v.optional(v.string()),
      columnId: v.optional(v.string()),
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
});
