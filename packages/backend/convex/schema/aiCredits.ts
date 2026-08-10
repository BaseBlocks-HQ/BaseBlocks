import { defineTable } from "convex/server";
import { v } from "convex/values";

const creditBucket = v.union(v.literal("included"), v.literal("prepaid"));
const providerEnvironment = v.union(
  v.literal("sandbox"),
  v.literal("production"),
);

export const aiCreditTables = {
  aiCreditAccounts: defineTable({
    organizationId: v.string(),
    availableIncludedUnits: v.int64(),
    availablePrepaidUnits: v.int64(),
    reservedIncludedUnits: v.int64(),
    reservedPrepaidUnits: v.int64(),
    lifetimeGrantedUnits: v.int64(),
    lifetimeConsumedUnits: v.int64(),
    status: v.union(v.literal("active"), v.literal("blockedReconciliation")),
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
    reservedUnits: v.int64(),
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

  aiCreditReservations: defineTable({
    organizationId: v.string(),
    actorId: v.string(),
    siteId: v.optional(v.id("sites")),
    aiRunId: v.optional(v.id("aiRuns")),
    requestId: v.string(),
    promptFingerprint: v.string(),
    feature: v.string(),
    providerEnvironment,
    modelId: v.string(),
    status: v.union(
      v.literal("reserved"),
      v.literal("settled"),
      v.literal("released"),
      v.literal("reconcilePending"),
    ),
    maximumUnits: v.int64(),
    reservedIncludedUnits: v.int64(),
    reservedPrepaidUnits: v.int64(),
    settledUnits: v.int64(),
    releasedUnits: v.int64(),
    generationIds: v.array(v.string()),
    policyVersion: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    settledAt: v.optional(v.number()),
    releasedAt: v.optional(v.number()),
    failureCode: v.optional(v.string()),
  })
    .index("by_org_request", ["organizationId", "actorId", "requestId"])
    .index("by_run", ["aiRunId"])
    .index("by_status_expiry", ["status", "expiresAt"])
    .index("by_org_status", ["organizationId", "status"]),

  aiCreditReservationAllocations: defineTable({
    reservationId: v.id("aiCreditReservations"),
    lotId: v.id("aiCreditLots"),
    bucket: creditBucket,
    reservedUnits: v.int64(),
    settledUnits: v.int64(),
    releasedUnits: v.int64(),
    spendPriority: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_reservation", ["reservationId"])
    .index("by_lot", ["lotId"]),

  aiCreditLedgerEntries: defineTable({
    organizationId: v.string(),
    actorId: v.optional(v.string()),
    runId: v.optional(v.id("aiRuns")),
    reservationId: v.optional(v.id("aiCreditReservations")),
    lotId: v.optional(v.id("aiCreditLots")),
    billingEventId: v.optional(v.id("billingWebhookEvents")),
    eventKind: v.union(
      v.literal("grant"),
      v.literal("reserve"),
      v.literal("settle"),
      v.literal("release"),
      v.literal("expire"),
      v.literal("adjust"),
      v.literal("refund"),
      v.literal("reconcile"),
    ),
    bucket: creditBucket,
    availableDeltaUnits: v.int64(),
    reservedDeltaUnits: v.int64(),
    consumedDeltaUnits: v.int64(),
    idempotencyKey: v.string(),
    externalRef: v.optional(v.string()),
    policyVersion: v.string(),
    createdAt: v.number(),
  })
    .index("by_org_created", ["organizationId", "createdAt"])
    .index("by_org_idempotency", ["organizationId", "idempotencyKey"])
    .index("by_reservation", ["reservationId", "createdAt"])
    .index("by_external_ref", ["externalRef"])
    .index("by_run", ["runId"])
    .index("by_lot", ["lotId", "createdAt"]),

  aiGatewayGenerations: defineTable({
    generationId: v.string(),
    reservationId: v.id("aiCreditReservations"),
    runId: v.optional(v.id("aiRuns")),
    organizationId: v.string(),
    actorId: v.string(),
    siteId: v.optional(v.id("sites")),
    requestId: v.string(),
    feature: v.string(),
    providerEnvironment,
    requestedModelId: v.string(),
    resolvedModelId: v.optional(v.string()),
    provider: v.optional(v.string()),
    status: v.union(
      v.literal("observed"),
      v.literal("costed"),
      v.literal("failed"),
      v.literal("reconcilePending"),
    ),
    totalCostUnits: v.optional(v.int64()),
    retailChargeUnits: v.optional(v.int64()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    reasoningTokens: v.optional(v.number()),
    cachedInputTokens: v.optional(v.number()),
    cacheCreationTokens: v.optional(v.number()),
    webSearchCalls: v.optional(v.number()),
    latencyMs: v.optional(v.number()),
    finishReason: v.optional(v.string()),
    observedAt: v.number(),
    reconciledAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_generation", ["generationId"])
    .index("by_reservation", ["reservationId"])
    .index("by_org_created", ["organizationId", "observedAt"])
    .index("by_actor_created", ["actorId", "observedAt"])
    .index("by_status_observed", ["status", "observedAt"]),

  aiCreditRateCards: defineTable({
    providerEnvironment,
    policyVersion: v.string(),
    modelId: v.string(),
    inputUnitsPerMillionTokens: v.int64(),
    outputUnitsPerMillionTokens: v.int64(),
    cachedInputUnitsPerMillionTokens: v.optional(v.int64()),
    safetyBufferBps: v.number(),
    dailyRunLimit: v.number(),
    maxActorConcurrency: v.number(),
    maxSiteConcurrency: v.number(),
    maxOrganizationConcurrency: v.number(),
    maxRequestsPerRun: v.number(),
    maxInputTokensPerRun: v.number(),
    maxOutputTokensPerRun: v.number(),
    maxChargeUnits: v.int64(),
    effectiveFrom: v.number(),
    effectiveThrough: v.optional(v.number()),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_environment_policy", ["providerEnvironment", "policyVersion"])
    .index("by_model_effective", [
      "providerEnvironment",
      "modelId",
      "effectiveFrom",
    ]),
};
