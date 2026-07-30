import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  integrationConnectionStatus,
  integrationProvider,
  integrationSyncStatus,
} from "./validators/integrations";
import { siteSettings } from "./validators/sites";

export default defineSchema({
  sites: defineTable({
    organizationId: v.string(),
    name: v.string(),
    slug: v.string(),
    logoUrl: v.optional(v.string()),
    logoFileId: v.optional(v.id("files")),
    defaultPageId: v.optional(v.id("pages")),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    visibility: v.union(v.literal("private"), v.literal("public")),
    settings: siteSettings,
    draftRevision: v.number(),
    nextReleaseNumber: v.number(),
    liveReleaseId: v.optional(v.id("siteReleases")),
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
    deletedAt: v.optional(v.number()),
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

  documentLibraries: defineTable({
    siteId: v.id("sites"),
    name: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  }).index("by_site", ["siteId"]),

  documentFolders: defineTable({
    libraryId: v.id("documentLibraries"),
    parentId: v.optional(v.id("documentFolders")),
    name: v.string(),
    order: v.number(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
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
    deletedAt: v.optional(v.number()),
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

  siteReleases: defineTable({
    siteId: v.id("sites"),
    number: v.number(),
    name: v.string(),
    logoFileId: v.optional(v.id("files")),
    defaultPageId: v.optional(v.id("pages")),
    settings: siteSettings,
    sourceDraftRevision: v.number(),
    previousReleaseId: v.optional(v.id("siteReleases")),
    createdBy: v.string(),
    createdAt: v.number(),
    pageCount: v.number(),
    changeCount: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_site_number", ["siteId", "number"]),

  releasePages: defineTable({
    releaseId: v.id("siteReleases"),
    siteId: v.id("sites"),
    pageId: v.id("pages"),
    parentId: v.optional(v.id("pages")),
    title: v.string(),
    slug: v.string(),
    icon: v.optional(v.string()),
    order: v.number(),
    blobId: v.optional(v.id("pageContentBlobs")),
    contentHash: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_release", ["releaseId"])
    .index("by_release_page", ["releaseId", "pageId"])
    .index("by_blob", ["blobId"])
    .index("by_release_parent_slug", ["releaseId", "parentId", "slug"]),

  releaseLibraries: defineTable({
    releaseId: v.id("siteReleases"),
    siteId: v.id("sites"),
    libraryId: v.id("documentLibraries"),
    name: v.string(),
  })
    .index("by_release", ["releaseId"])
    .index("by_release_library", ["releaseId", "libraryId"]),

  releaseFolders: defineTable({
    releaseId: v.id("siteReleases"),
    siteId: v.id("sites"),
    libraryId: v.id("documentLibraries"),
    folderId: v.id("documentFolders"),
    parentId: v.optional(v.id("documentFolders")),
    name: v.string(),
    order: v.number(),
  })
    .index("by_release", ["releaseId"])
    .index("by_release_library", ["releaseId", "libraryId"]),

  releaseFiles: defineTable({
    releaseId: v.id("siteReleases"),
    siteId: v.id("sites"),
    fileId: v.id("files"),
    kind: v.union(v.literal("file"), v.literal("siteAsset")),
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
    .index("by_release", ["releaseId"])
    .index("by_release_file", ["releaseId", "fileId"])
    .index("by_release_library", ["releaseId", "libraryId"]),

  releaseSearchEntries: defineTable({
    releaseId: v.id("siteReleases"),
    siteId: v.id("sites"),
    kind: v.union(v.literal("file"), v.literal("page")),
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
  })
    .index("by_release", ["releaseId"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["releaseId", "kind"],
    })
    .searchIndex("search_text", {
      searchField: "text",
      filterFields: ["releaseId", "kind"],
    }),

  releaseChanges: defineTable({
    releaseId: v.id("siteReleases"),
    entityType: v.union(
      v.literal("site"),
      v.literal("page"),
      v.literal("library"),
      v.literal("folder"),
      v.literal("file"),
    ),
    entityId: v.string(),
    changeType: v.union(
      v.literal("added"),
      v.literal("updated"),
      v.literal("deleted"),
      v.literal("moved"),
    ),
    label: v.string(),
    details: v.array(v.string()),
  }).index("by_release", ["releaseId"]),

  publicationEvents: defineTable({
    siteId: v.id("sites"),
    action: v.union(
      v.literal("publish"),
      v.literal("update"),
      v.literal("rollback"),
      v.literal("republish"),
      v.literal("unpublish"),
      v.literal("restoreDraft"),
    ),
    fromReleaseId: v.optional(v.id("siteReleases")),
    toReleaseId: v.optional(v.id("siteReleases")),
    actorId: v.string(),
    createdAt: v.number(),
  }).index("by_site", ["siteId"]),

  integrationConnections: defineTable({
    organizationId: v.string(),
    provider: integrationProvider,
    adapter: v.literal("nango"),
    adapterConnectionId: v.optional(v.string()),
    status: integrationConnectionStatus,
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    connectedAt: v.optional(v.number()),
    disconnectedAt: v.optional(v.number()),
    lastSyncAt: v.optional(v.number()),
    resourceCount: v.number(),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_provider", ["organizationId", "provider"])
    .index("by_adapter_connection", ["adapter", "adapterConnectionId"]),

  integrationSyncStates: defineTable({
    connectionId: v.id("integrationConnections"),
    stream: v.string(),
    model: v.string(),
    status: integrationSyncStatus,
    cursor: v.optional(v.string()),
    rerunRequested: v.boolean(),
    attempt: v.number(),
    updatedAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  })
    .index("by_connection_stream", ["connectionId", "stream"])
    .index("by_status_updated", ["status", "updatedAt"]),

  integrationResources: defineTable({
    organizationId: v.string(),
    connectionId: v.id("integrationConnections"),
    provider: integrationProvider,
    externalId: v.string(),
    resourceType: v.string(),
    title: v.string(),
    url: v.optional(v.string()),
    parentExternalId: v.optional(v.string()),
    providerCreatedAt: v.optional(v.string()),
    providerUpdatedAt: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_connection", ["connectionId"])
    .index("by_connection_external", ["connectionId", "externalId"])
    .index("by_organization_provider", ["organizationId", "provider"]),
});
