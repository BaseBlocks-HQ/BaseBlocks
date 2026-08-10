import { defineTable } from "convex/server";
import { v } from "convex/values";

export const workspaceTables = {
  workspaceProfiles: defineTable({
    organizationId: v.string(),
    intent: v.union(v.literal("personal"), v.literal("work")),
    source: v.union(
      v.literal("onboarding"),
      v.literal("migration"),
      v.literal("lazyPersonal"),
    ),
    schemaVersion: v.number(),
    createdBy: v.optional(v.string()),
    migratedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_intent", ["intent"]),

  workspaceMigrationRuns: defineTable({
    migrationKey: v.string(),
    runId: v.string(),
    mode: v.union(v.literal("dryRun"), v.literal("apply")),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    checkpoint: v.optional(v.string()),
    scannedCount: v.number(),
    personalCount: v.number(),
    workCount: v.number(),
    createdCount: v.number(),
    skippedCount: v.number(),
    errorCount: v.number(),
    failureSummary: v.optional(v.string()),
    startedAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_migration_run", ["migrationKey", "runId"])
    .index("by_status_updated", ["status", "updatedAt"])
    .index("by_migration_started", ["migrationKey", "startedAt"]),

  pageGuestInvitations: defineTable({
    organizationId: v.string(),
    siteId: v.id("sites"),
    pageId: v.id("pages"),
    normalizedEmail: v.string(),
    tokenHash: v.string(),
    permission: v.union(v.literal("viewer"), v.literal("editor")),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("revoked"),
      v.literal("expired"),
    ),
    invitedBy: v.string(),
    acceptedBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    expiresAt: v.number(),
    acceptedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    revokedBy: v.optional(v.string()),
  })
    .index("by_token", ["tokenHash"])
    .index("by_page_email_status", ["pageId", "normalizedEmail", "status"])
    .index("by_email_status", ["normalizedEmail", "status"])
    .index("by_site_status", ["siteId", "status"])
    .index("by_organization", ["organizationId"]),

  pageGuestGrants: defineTable({
    organizationId: v.string(),
    siteId: v.id("sites"),
    pageId: v.id("pages"),
    userId: v.string(),
    permission: v.union(v.literal("viewer"), v.literal("editor")),
    status: v.union(v.literal("active"), v.literal("revoked")),
    invitationId: v.optional(v.id("pageGuestInvitations")),
    grantedBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    revokedAt: v.optional(v.number()),
    revokedBy: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_page_user_status", ["pageId", "userId", "status"])
    .index("by_user_site_status", ["userId", "siteId", "status"])
    .index("by_site_status", ["siteId", "status"])
    .index("by_organization_status", ["organizationId", "status"]),
};
