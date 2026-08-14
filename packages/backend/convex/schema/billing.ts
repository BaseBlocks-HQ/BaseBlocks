import { defineTable } from "convex/server";
import { v } from "convex/values";

const providerEnvironment = v.union(
  v.literal("sandbox"),
  v.literal("production"),
);

export const billingTables = {
  billingCatalogItems: defineTable({
    providerEnvironment,
    sku: v.string(),
    kind: v.union(v.literal("plus"), v.literal("aiCreditPack")),
    providerProductId: v.string(),
    providerPriceId: v.optional(v.string()),
    planKey: v.optional(v.literal("plus")),
    recurringInterval: v.optional(
      v.union(v.literal("month"), v.literal("year")),
    ),
    priceAmountMinor: v.int64(),
    currency: v.string(),
    creditUnits: v.optional(v.int64()),
    configurationVersion: v.string(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_environment_sku", ["providerEnvironment", "sku"])
    .index("by_environment_product", [
      "providerEnvironment",
      "providerProductId",
    ])
    .index("by_environment_price", ["providerEnvironment", "providerPriceId"]),

  billingCustomers: defineTable({
    organizationId: v.string(),
    provider: v.literal("polar"),
    providerEnvironment,
    providerCustomerId: v.string(),
    externalCustomerId: v.string(),
    lastSyncedAt: v.number(),
    lastErrorCode: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization_environment", [
      "organizationId",
      "providerEnvironment",
    ])
    .index("by_provider_customer", [
      "providerEnvironment",
      "providerCustomerId",
    ])
    .index("by_external_customer", [
      "providerEnvironment",
      "externalCustomerId",
    ]),

  billingSubscriptions: defineTable({
    organizationId: v.string(),
    providerEnvironment,
    providerSubscriptionId: v.string(),
    providerCustomerId: v.string(),
    providerProductId: v.string(),
    providerPriceId: v.optional(v.string()),
    planKey: v.literal("plus"),
    recurringInterval: v.union(v.literal("month"), v.literal("year")),
    providerStatus: v.string(),
    normalizedStatus: v.union(
      v.literal("pending"),
      v.literal("entitled"),
      v.literal("grace"),
      v.literal("suspended"),
      v.literal("terminated"),
      v.literal("unknown"),
    ),
    seatQuantity: v.number(),
    pendingSeatQuantity: v.optional(v.number()),
    pendingProductId: v.optional(v.string()),
    cancelAtPeriodEnd: v.boolean(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    trialStart: v.optional(v.number()),
    trialEnd: v.optional(v.number()),
    pastDueAt: v.optional(v.number()),
    cancelAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    providerModifiedAt: v.number(),
    latestEventOccurredAt: v.optional(v.number()),
    latestWebhookDeliveryId: v.optional(v.string()),
    lastReconciledAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_environment_status_updated", [
      "organizationId",
      "providerEnvironment",
      "normalizedStatus",
      "updatedAt",
    ])
    .index("by_provider_subscription", [
      "providerEnvironment",
      "providerSubscriptionId",
    ])
    .index("by_provider_customer", [
      "providerEnvironment",
      "providerCustomerId",
    ])
    .index("by_status_reconcile", ["normalizedStatus", "lastReconciledAt"])
    .index("by_period_end", ["normalizedStatus", "currentPeriodEnd"]),

  workspaceEntitlements: defineTable({
    organizationId: v.string(),
    plan: v.union(v.literal("free"), v.literal("plus")),
    subscriptionStatus: v.union(
      v.literal("pending"),
      v.literal("entitled"),
      v.literal("grace"),
      v.literal("suspended"),
      v.literal("terminated"),
      v.literal("unknown"),
    ),
    statusReason: v.string(),
    plusEnabled: v.boolean(),
    paidSeatCapacity: v.number(),
    billableSeatCount: v.number(),
    sourceSubscriptionId: v.optional(v.id("billingSubscriptions")),
    sourceEventId: v.optional(v.id("billingWebhookEvents")),
    effectiveFrom: v.number(),
    effectiveThrough: v.optional(v.number()),
    policyVersion: v.string(),
    derivedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_subscription", ["sourceSubscriptionId"]),

  billingOrders: defineTable({
    organizationId: v.string(),
    providerEnvironment,
    providerOrderId: v.string(),
    providerCheckoutId: v.optional(v.string()),
    providerCustomerId: v.string(),
    providerSubscriptionId: v.optional(v.string()),
    providerProductId: v.string(),
    kind: v.union(v.literal("subscription"), v.literal("prepaid")),
    state: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("refunded"),
      v.literal("partiallyRefunded"),
      v.literal("failed"),
    ),
    // Explicit monetary views from Polar. Gross is the customer-facing total
    // (including tax); net is the merchant amount before tax.
    subtotalAmountMinor: v.int64(),
    discountAmountMinor: v.int64(),
    taxAmountMinor: v.int64(),
    grossAmountMinor: v.int64(),
    netAmountMinor: v.int64(),
    refundedGrossAmountMinor: v.int64(),
    currency: v.string(),
    billingReason: v.optional(v.string()),
    creditLotId: v.optional(v.id("aiCreditLots")),
    providerModifiedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_provider_order", ["providerEnvironment", "providerOrderId"])
    .index("by_provider_checkout", [
      "providerEnvironment",
      "providerCheckoutId",
    ])
    .index("by_organization_created", ["organizationId", "createdAt"])
    .index("by_subscription_reason", [
      "providerSubscriptionId",
      "billingReason",
    ]),

  billingCheckoutIntents: defineTable({
    organizationId: v.string(),
    actorId: v.string(),
    providerEnvironment,
    purpose: v.union(v.literal("plus"), v.literal("aiCreditPack")),
    sku: v.string(),
    requestedSeats: v.optional(v.number()),
    requestedAmountMinor: v.optional(v.int64()),
    idempotencyKey: v.string(),
    providerCheckoutId: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("retryable"),
      v.literal("created"),
      v.literal("completed"),
      v.literal("expired"),
      v.literal("failed"),
    ),
    expiresAt: v.optional(v.number()),
    attemptCount: v.optional(v.number()),
    activeAttemptId: v.optional(v.string()),
    leaseExpiresAt: v.optional(v.number()),
    nextAttemptAt: v.optional(v.number()),
    failureCode: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization_idempotency", ["organizationId", "idempotencyKey"])
    .index("by_provider_checkout", [
      "providerEnvironment",
      "providerCheckoutId",
    ])
    .index("by_status_expiry", ["status", "expiresAt"]),

  billingSeatSnapshots: defineTable({
    organizationId: v.string(),
    subscriptionId: v.optional(v.id("billingSubscriptions")),
    membershipRevision: v.string(),
    memberIds: v.array(v.string()),
    billableSeatCount: v.number(),
    source: v.union(
      v.literal("checkout"),
      v.literal("membership"),
      v.literal("webhook"),
      v.literal("reconcile"),
    ),
    observedAt: v.number(),
  })
    .index("by_organization_observed", ["organizationId", "observedAt"])
    .index("by_membership_revision", ["organizationId", "membershipRevision"]),

  billingSeatSyncOperations: defineTable({
    organizationId: v.string(),
    subscriptionId: v.id("billingSubscriptions"),
    membershipRevision: v.string(),
    previousSeats: v.number(),
    targetSeats: v.number(),
    idempotencyKey: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("applied"),
      v.literal("failed"),
    ),
    attemptCount: v.number(),
    leaseExpiresAt: v.optional(v.number()),
    nextAttemptAt: v.optional(v.number()),
    failureCode: v.optional(v.string()),
    providerModifiedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization_idempotency", ["organizationId", "idempotencyKey"])
    .index("by_status_retry", ["status", "nextAttemptAt"])
    .index("by_subscription_created", ["subscriptionId", "createdAt"]),

  billingWebhookEvents: defineTable({
    providerEnvironment,
    deliveryId: v.string(),
    eventType: v.string(),
    eventOccurredAt: v.number(),
    resourceId: v.string(),
    organizationId: v.string(),
    outcome: v.union(v.literal("applied"), v.literal("ignored")),
    ignoredReason: v.optional(v.string()),
    receivedAt: v.number(),
    processedAt: v.number(),
  })
    .index("by_environment_delivery", ["providerEnvironment", "deliveryId"])
    .index("by_organization_received", ["organizationId", "receivedAt"])
    .index("by_type_occurred", ["eventType", "eventOccurredAt"]),

  billingReconciliationRuns: defineTable({
    kind: v.union(
      v.literal("subscriptions"),
      v.literal("seats"),
      v.literal("orders"),
      v.literal("webhooks"),
    ),
    organizationId: v.optional(v.string()),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    cursor: v.optional(v.string()),
    scannedCount: v.number(),
    repairedCount: v.number(),
    skippedCount: v.number(),
    errorCount: v.number(),
    failureCode: v.optional(v.string()),
    startedAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_status_updated", ["status", "updatedAt"])
    .index("by_organization_started", ["organizationId", "startedAt"]),
};
