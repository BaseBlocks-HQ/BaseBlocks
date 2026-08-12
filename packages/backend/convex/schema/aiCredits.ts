import { defineTable } from "convex/server";
import { v } from "convex/values";

const creditBucket = v.union(v.literal("included"), v.literal("prepaid"));

/**
 * AI credits are a funding ledger, not an execution-policy engine. Polar
 * creates/revokes lots and each completed Gateway generation consumes its
 * authoritative cost exactly once.
 */
export const aiCreditTables = {
  aiCreditAccounts: defineTable({
    organizationId: v.string(),
    availableIncludedUnits: v.int64(),
    availablePrepaidUnits: v.int64(),
    lifetimeGrantedUnits: v.int64(),
    lifetimeConsumedUnits: v.int64(),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_organization", ["organizationId"]),

  aiCreditLots: defineTable({
    organizationId: v.string(),
    bucket: creditBucket,
    sourceKind: v.union(
      v.literal("recurring"),
      v.literal("purchase"),
      v.literal("adjustment"),
      v.literal("refund"),
    ),
    sourceRef: v.string(),
    grantedUnits: v.int64(),
    availableUnits: v.int64(),
    revokedUnits: v.int64(),
    periodStart: v.optional(v.number()),
    periodEnd: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    spendPriority: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_bucket_expiry", [
      "organizationId",
      "bucket",
      "spendPriority",
      "expiresAt",
    ])
    .index("by_source_ref", ["organizationId", "sourceRef"])
    .index("by_expiry", ["bucket", "expiresAt"]),

  aiCreditLedgerEntries: defineTable({
    organizationId: v.string(),
    actorId: v.optional(v.string()),
    runId: v.optional(v.id("siteAssistantRuns")),
    lotId: v.optional(v.id("aiCreditLots")),
    billingEventId: v.optional(v.id("billingWebhookEvents")),
    eventKind: v.union(
      v.literal("grant"),
      v.literal("expire"),
      v.literal("adjust"),
      v.literal("refund"),
      v.literal("reconcile"),
      v.literal("consume"),
    ),
    bucket: creditBucket,
    availableDeltaUnits: v.int64(),
    consumedDeltaUnits: v.int64(),
    idempotencyKey: v.string(),
    externalRef: v.optional(v.string()),
    policyVersion: v.string(),
    createdAt: v.number(),
  })
    .index("by_org_created", ["organizationId", "createdAt"])
    .index("by_org_idempotency", ["organizationId", "idempotencyKey"])
    .index("by_external_ref", ["externalRef"])
    .index("by_run", ["runId"])
    .index("by_lot", ["lotId", "createdAt"]),
};
