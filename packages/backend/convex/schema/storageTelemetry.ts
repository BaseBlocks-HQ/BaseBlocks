import { defineTable } from "convex/server";
import { v } from "convex/values";

export const storageTelemetryTables = {
  workspaceStorageUsage: defineTable({
    organizationId: v.string(),
    activeFileBytes: v.int64(),
    retainedFileBytes: v.int64(),
    contentPayloadBytes: v.int64(),
    logicalRevisionBytes: v.int64(),
    activeFileCount: v.number(),
    retainedFileCount: v.number(),
    contentPayloadCount: v.number(),
    lastEventAt: v.optional(v.number()),
    lastReconciledAt: v.optional(v.number()),
    reconciliationVersion: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_organization", ["organizationId"]),

  storageUsageEvents: defineTable({
    organizationId: v.string(),
    siteId: v.optional(v.id("sites")),
    actorId: v.optional(v.string()),
    fileId: v.optional(v.id("files")),
    contentRevisionId: v.optional(v.id("contentRevisions")),
    kind: v.union(
      v.literal("upload"),
      v.literal("softDelete"),
      v.literal("restore"),
      v.literal("purge"),
      v.literal("contentCreate"),
      v.literal("reconcileAdjustment"),
    ),
    logicalBytesDelta: v.int64(),
    storedBytesDelta: v.int64(),
    objectCountDelta: v.int64(),
    idempotencyKey: v.string(),
    createdAt: v.number(),
  })
    .index("by_org_created", ["organizationId", "createdAt"])
    .index("by_org_idempotency", ["organizationId", "idempotencyKey"])
    .index("by_site_created", ["siteId", "createdAt"])
    .index("by_file", ["fileId"]),

  storageTelemetryReconciliations: defineTable({
    organizationId: v.string(),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    cursor: v.optional(v.string()),
    observedActiveFileBytes: v.int64(),
    observedRetainedFileBytes: v.int64(),
    observedContentPayloadBytes: v.int64(),
    observedLogicalRevisionBytes: v.int64(),
    reconciliationVersion: v.string(),
    failureCode: v.optional(v.string()),
    startedAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_org_created", ["organizationId", "startedAt"])
    .index("by_status_started", ["status", "startedAt"]),
};
