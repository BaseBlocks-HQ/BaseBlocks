import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { pageAccessPolicyValidator } from "./sharing";
import { siteSettings } from "./sites";

export default defineSchema({
  sites: defineTable({
    organizationId: v.string(),
    name: v.string(),
    slug: v.string(), // site slug within team
    logoUrl: v.optional(v.string()),
    logoFileId: v.optional(v.id("files")),
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
    .index("by_organization_slug", ["organizationId", "slug"])
    .index("by_published", ["isPublished"])
    .index("by_published_visibility", ["isPublished", "visibility"]),

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
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_parent", ["siteId", "parentId"])
    .index("by_slug", ["siteId", "slug"]),

  // OpenEditor documents are serialized to stay below Convex's nesting limit.
  openEditorPageContents: defineTable({
    siteId: v.id("sites"),
    pageId: v.id("pages"),
    document: v.any(),
    migratedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_page", ["pageId"]),

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

  files: defineTable({
    siteId: v.id("sites"),
    kind: v.union(v.literal("document"), v.literal("siteAsset")),
    visibility: v.union(v.literal("public"), v.literal("private")),
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
    .index("by_object_key", ["objectKey"]),

  documents: defineTable({
    siteId: v.id("sites"),
    libraryId: v.optional(v.id("documentLibraries")),
    folderId: v.optional(v.id("documentFolders")),
    fileId: v.id("files"),
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

  searchEntries: defineTable({
    siteId: v.id("sites"),
    kind: v.union(v.literal("document"), v.literal("page")),
    sourceId: v.string(),
    title: v.string(),
    text: v.string(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_source", ["kind", "sourceId"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["siteId", "kind"],
    })
    .searchIndex("search_text", {
      searchField: "text",
      filterFields: ["siteId", "kind"],
    }),
});
