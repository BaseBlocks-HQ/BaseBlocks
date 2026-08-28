import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  integrationConnectionStatus,
  integrationProvider,
  integrationSyncStatus,
} from "./validators/integrations";
import { siteSettings } from "./validators/sites";
import {
  siteAssistantMessagePart,
  siteAssistantRunStatus,
} from "./validators/ai";
import { workspaceTables } from "./schema/workspaces";
import { billingTables } from "./schema/billing";
import { aiCreditTables } from "./schema/aiCredits";
import { storageTelemetryTables } from "./schema/storageTelemetry";

export default defineSchema({
  ...workspaceTables,
  ...billingTables,
  ...aiCreditTables,
  ...storageTelemetryTables,
  sites: defineTable({
    organizationId: v.string(),
    name: v.string(),
    slug: v.string(),
    logoFileId: v.optional(v.id("files")),
    faviconFileId: v.optional(v.id("files")),
    defaultPageId: v.optional(v.id("pages")),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    visibility: v.union(v.literal("private"), v.literal("public")),
    settings: siteSettings,
    draftRevision: v.number(),
    draftBaseReleaseId: v.optional(v.id("siteReleases")),
    activeDraftRestoreId: v.optional(v.id("draftRestores")),
    nextReleaseNumber: v.number(),
    liveReleaseId: v.optional(v.id("siteReleases")),
    /** Fences overlapping asynchronous live-search projections. */
    liveSearchProjectionGeneration: v.optional(v.number()),
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

  contentPayloads: defineTable({
    siteId: v.id("sites"),
    contentHash: v.string(),
    contentSize: v.number(),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_site_hash", ["siteId", "contentHash"]),

  contentRevisions: defineTable({
    siteId: v.id("sites"),
    contentHash: v.string(),
    contentSize: v.number(),
    payloadId: v.id("contentPayloads"),
    /**
     * Extracted plain text captured once when the revision is written.
     * Publication, search projection, and metadata reads consume this
     * instead of re-parsing the payload.
     */
    searchText: v.optional(v.string()),
    libraryIds: v.array(v.id("documentLibraries")),
    fileIds: v.array(v.id("files")),
    pageIds: v.array(v.id("pages")),
    createdAt: v.number(),
  })
    .index("by_site_hash", ["siteId", "contentHash"])
    .index("by_payload", ["payloadId"]),

  pageDocuments: defineTable({
    siteId: v.id("sites"),
    pageId: v.id("pages"),
    revisionId: v.id("contentRevisions"),
    contentHash: v.string(),
    contentSize: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_page", ["pageId"])
    .index("by_revision", ["revisionId"]),

  /**
   * Progress for the publication manifest backfill. The migration is kept
   * separate from the legacy publication workflow so it can be dry-run and
   * resumed without changing publication behavior.
   */
  publicationMigrationRuns: defineTable({
    migrationKey: v.string(),
    runId: v.string(),
    mode: v.union(v.literal("dryRun"), v.literal("apply")),
    phase: v.union(
      v.literal("revisions"),
      v.literal("pages"),
      v.literal("files"),
      v.literal("search"),
      v.literal("sites"),
    ),
    cursor: v.optional(v.string()),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    scannedCount: v.number(),
    migratedCount: v.number(),
    skippedCount: v.number(),
    scheduledCount: v.optional(v.number()),
    errorCount: v.number(),
    startedAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
    failureSummary: v.optional(v.string()),
  }).index("by_migration_run", ["migrationKey", "runId"]),

  draftChanges: defineTable({
    siteId: v.id("sites"),
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
    draftRevision: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_site_entity", ["siteId", "entityType", "entityId"]),

  /**
   * The site assistant is turn/run based: a turn owns its immutable user
   * message and an ordered event journal. The reactive query projects the
   * journal into UIMessage-shaped messages; no second flattened message model
   * can drift from execution state.
   */
  siteAssistantConversations: defineTable({
    siteId: v.id("sites"),
    organizationId: v.string(),
    actorId: v.string(),
    title: v.string(),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site_actor_updated", ["siteId", "actorId", "updatedAt"])
    .index("by_site", ["siteId"]),

  siteAssistantRuns: defineTable({
    conversationId: v.id("siteAssistantConversations"),
    siteId: v.id("sites"),
    organizationId: v.string(),
    actorId: v.string(),
    canManageSite: v.boolean(),
    requestId: v.string(),
    modelId: v.string(),
    status: siteAssistantRunStatus,
    userMessageId: v.string(),
    userParts: v.array(siteAssistantMessagePart),
    workflowId: v.optional(v.string()),
    cancellationFence: v.number(),
    failureCode: v.optional(v.string()),
    failureMessage: v.optional(v.string()),
    revertedAt: v.optional(v.number()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_conversation_created", ["conversationId", "createdAt"])
    .index("by_site_actor_request", ["siteId", "actorId", "requestId"])
    .index("by_site_status", ["siteId", "status"])
    .index("by_organization_status", ["organizationId", "status"]),

  siteAssistantEvents: defineTable({
    runId: v.id("siteAssistantRuns"),
    conversationId: v.id("siteAssistantConversations"),
    sequence: v.number(),
    part: siteAssistantMessagePart,
    createdAt: v.number(),
  })
    .index("by_run_sequence", ["runId", "sequence"])
    .index("by_conversation_created", ["conversationId", "createdAt"]),

  /** Gateway truth is stored per generation and costed asynchronously. */
  siteAssistantGenerations: defineTable({
    runId: v.id("siteAssistantRuns"),
    generationId: v.string(),
    requestedModelId: v.string(),
    resolvedModelId: v.optional(v.string()),
    provider: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    reasoningTokens: v.optional(v.number()),
    cachedInputTokens: v.optional(v.number()),
    finishReason: v.optional(v.string()),
    costUsd: v.optional(v.number()),
    costStatus: v.union(
      v.literal("pending"),
      v.literal("costed"),
      v.literal("failed"),
    ),
    reconciliationAttempts: v.optional(v.number()),
    reconciliationFailureCode: v.optional(v.string()),
    observedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_run", ["runId"])
    .index("by_generation", ["generationId"])
    .index("by_cost_status", ["costStatus", "observedAt"]),

  siteAssistantApplications: defineTable({
    runId: v.id("siteAssistantRuns"),
    toolCallId: v.string(),
    siteId: v.id("sites"),
    operationCount: v.number(),
    actorId: v.string(),
    baseDraftRevision: v.number(),
    resultDraftRevision: v.number(),
    operations: v.any(),
    previousSite: v.any(),
    previousPages: v.any(),
    createdAt: v.number(),
    revertedAt: v.optional(v.number()),
    revertedBy: v.optional(v.string()),
    revertDraftRevision: v.optional(v.number()),
  })
    .index("by_run", ["runId"])
    .index("by_run_tool_call", ["runId", "toolCallId"])
    .index("by_site_created", ["siteId", "createdAt"]),

  documentLibraries: defineTable({
    siteId: v.id("sites"),
    name: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  }).index("by_site", ["siteId"]),

  documentFolders: defineTable({
    siteId: v.id("sites"),
    libraryId: v.id("documentLibraries"),
    parentId: v.optional(v.id("documentFolders")),
    name: v.string(),
    order: v.number(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_site", ["siteId"])
    .index("by_parent", ["libraryId", "parentId"]),

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
    assetState: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("attached"),
        v.literal("retired"),
        v.literal("deleting"),
      ),
    ),
    assetExpiresAt: v.optional(v.number()),
    assetAttachedAt: v.optional(v.number()),
    assetPurgeAfter: v.optional(v.number()),
    assetPurgeError: v.optional(v.string()),
  })
    .index("by_site", ["siteId"])
    .index("by_asset_state_purge", ["kind", "assetState", "assetPurgeAfter"])
    .index("by_site_kind", ["siteId", "kind"])
    .index("by_library", ["libraryId"])
    .index("by_folder", ["libraryId", "folderId"]),

  fileExtractions: defineTable({
    siteId: v.id("sites"),
    fileId: v.id("files"),
    sourceVersion: v.string(),
    generation: v.number(),
    idempotencyKey: v.string(),
    workId: v.optional(v.string()),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("ready"),
      v.literal("failed"),
    ),
    extractedText: v.optional(v.string()),
    format: v.optional(v.string()),
    inputBytes: v.optional(v.number()),
    outputChars: v.optional(v.number()),
    failure: v.optional(
      v.object({
        code: v.string(),
        message: v.string(),
        retryable: v.boolean(),
        limit: v.optional(v.number()),
        actual: v.optional(v.number()),
        limits: v.optional(
          v.record(v.string(), v.union(v.number(), v.string())),
        ),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_site", ["siteId"])
    .index("by_site_status", ["siteId", "status"])
    .index("by_file", ["fileId"]),

  searchEntries: defineTable({
    siteId: v.id("sites"),
    scopeId: v.string(),
    /** Set only for published entries; draft entries remain scope-local. */
    releaseId: v.optional(v.id("siteReleases")),
    kind: v.union(v.literal("file"), v.literal("page")),
    sourceId: v.string(),
    title: v.string(),
    text: v.string(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_scope", ["scopeId"])
    .index("by_scope_source", ["scopeId", "kind", "sourceId"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["scopeId"],
    })
    .searchIndex("search_text", {
      searchField: "text",
      filterFields: ["scopeId"],
    }),

  siteReleases: defineTable({
    siteId: v.id("sites"),
    number: v.number(),
    name: v.string(),
    logoFileId: v.optional(v.id("files")),
    faviconFileId: v.optional(v.id("files")),
    defaultPageId: v.optional(v.id("pages")),
    settings: siteSettings,
    sourceDraftRevision: v.number(),
    previousReleaseId: v.optional(v.id("siteReleases")),
    createdBy: v.string(),
    createdAt: v.number(),
    pageCount: v.number(),
    changeCount: v.number(),
    /**
     * Legacy publication workflow fields remain optional so existing rows can
     * still be read while new releases use atomic activation.
     */
    publicationStatus: v.optional(
      v.union(
        v.literal("building"),
        v.literal("clearing"),
        v.literal("complete"),
        v.literal("failed"),
      ),
    ),
    publicationFailure: v.optional(v.string()),
    publicationWorkflowId: v.optional(v.string()),
    publicationUpdatedAt: v.optional(v.number()),
  })
    .index("by_site", ["siteId"])
    .index("by_site_number", ["siteId", "number"]),

  draftRestores: defineTable({
    siteId: v.id("sites"),
    releaseId: v.id("siteReleases"),
    requestedBy: v.string(),
    baseDraftRevision: v.number(),
    resultDraftRevision: v.optional(v.number()),
    status: v.union(
      v.literal("validating"),
      v.literal("applying"),
      v.literal("paused"),
      v.literal("complete"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    failure: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
    workflowId: v.optional(v.string()),
  }).index("by_site", ["siteId"]),

  releasePages: defineTable({
    releaseId: v.id("siteReleases"),
    siteId: v.id("sites"),
    pageId: v.id("pages"),
    parentId: v.optional(v.id("pages")),
    title: v.string(),
    slug: v.string(),
    icon: v.optional(v.string()),
    order: v.number(),
    contentRevisionId: v.optional(v.id("contentRevisions")),
    contentHash: v.optional(v.string()),
    /**
     * Short description snippet (bounded) resolved from the released
     * revision's captured search text. The live projection owns its searchable
     * copy; the release row keeps only this metadata snippet.
     */
    description: v.optional(v.string()),
    /** Compatibility with releases created before the description rename. */
    descriptionText: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_content_revision", ["contentRevisionId"])
    .index("by_release", ["releaseId"])
    .index("by_release_page", ["releaseId", "pageId"])
    .index("by_release_parent_order", ["releaseId", "parentId", "order"])
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
    .index("by_release_library", ["releaseId", "libraryId"])
    .index("by_release_folder", ["releaseId", "folderId"]),

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
    /** Immutable text captured for this released file's search projection. */
    extractedText: v.optional(v.string()),
  })
    .index("by_release", ["releaseId"])
    .index("by_release_file", ["releaseId", "fileId"])
    .index("by_file", ["fileId"])
    .index("by_release_library", ["releaseId", "libraryId"]),

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
    sourceDraftChangeId: v.optional(v.id("draftChanges")),
    sourceDraftRevision: v.optional(v.number()),
    fields: v.array(
      v.object({
        label: v.string(),
        before: v.optional(v.string()),
        after: v.optional(v.string()),
      }),
    ),
    content: v.optional(
      v.object({
        beforeLines: v.array(v.string()),
        afterLines: v.array(v.string()),
      }),
    ),
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
