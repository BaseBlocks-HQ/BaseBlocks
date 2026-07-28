import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { siteSettings } from "./validators/sites";

export default defineSchema({
  sites: defineTable({
    organizationId: v.string(),
    name: v.string(),
    slug: v.string(),
    logoUrl: v.optional(v.string()),
    logoFileId: v.optional(v.id("files")),
    defaultPageId: v.optional(v.id("pages")),
    isPublished: v.boolean(),
    publishedAt: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    visibility: v.union(v.literal("private"), v.literal("public")),
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

  pages: defineTable({
    siteId: v.id("sites"),
    parentId: v.optional(v.id("pages")),
    title: v.string(),
    slug: v.string(),
    icon: v.optional(v.string()),
    order: v.number(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_parent", ["siteId", "parentId"])
    .index("by_parent_order", ["siteId", "parentId", "order"])
    .index("by_slug", ["siteId", "slug"]),

  pageContentBlobs: defineTable({
    content: v.string(),
  }),

  pageDocuments: defineTable({
    siteId: v.id("sites"),
    pageId: v.id("pages"),
    blobId: v.id("pageContentBlobs"),
    contentHash: v.string(),
    contentSize: v.number(),
    referencesKey: v.string(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_page", ["pageId"]),

  pageReferences: defineTable({
    siteId: v.id("sites"),
    pageId: v.id("pages"),
    libraryIds: v.array(v.id("documentLibraries")),
    fileIds: v.array(v.id("files")),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_page", ["pageId"]),

  publicationStates: defineTable({
    siteId: v.id("sites"),
    activeLibraryIds: v.array(v.id("documentLibraries")),
    referencedFileIds: v.array(v.id("files")),
    updatedAt: v.number(),
  }).index("by_site", ["siteId"]),

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
    kind: v.union(v.literal("file"), v.literal("siteAsset")),
    visibility: v.union(v.literal("public"), v.literal("private")),
    objectKey: v.string(),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
    checksum: v.optional(v.string()),
    libraryId: v.optional(v.id("documentLibraries")),
    folderId: v.optional(v.id("documentFolders")),
    order: v.number(),
    uploadedBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_site_kind", ["siteId", "kind"])
    .index("by_library", ["libraryId"])
    .index("by_folder", ["libraryId", "folderId"]),

  searchEntries: defineTable({
    siteId: v.id("sites"),
    kind: v.union(v.literal("file"), v.literal("page")),
    audience: v.union(v.literal("private"), v.literal("public")),
    sourceId: v.string(),
    title: v.string(),
    text: v.string(),
    fileMetadata: v.optional(
      v.object({
        fileId: v.id("files"),
        filename: v.string(),
        fileContentType: v.string(),
        size: v.number(),
        libraryId: v.optional(v.id("documentLibraries")),
        downloadUrl: v.string(),
      }),
    ),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_source", ["kind", "sourceId"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["siteId", "kind", "audience"],
    })
    .searchIndex("search_text", {
      searchField: "text",
      filterFields: ["siteId", "kind", "audience"],
    }),
});
