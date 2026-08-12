import { ConvexError, v } from "convex/values";
import {
  boundedCheckoutRetryAt,
  CHECKOUT_ATTEMPT_LEASE_MS,
  checkoutAttemptCanAcquire,
  checkoutAttemptShouldReplay,
  newCheckoutIntentDocument,
} from "./billing/checkoutIntent";
import {
  aiTopUpAmountToCreditUnits,
  moneyAmountMinorToCreditUnits,
} from "@baseblocks/domain";
import { components, internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  grantAiCredits,
  reconcileAiCreditGrantUpward,
  replaceUnusedIncludedCreditLots,
  revokeAiCreditGrant,
} from "./model/aiCredits";
import { parsePolarOrderAmounts } from "./model/polarOrderAmounts";
import { shouldApplyProviderUpdate } from "./model/billingEventOrdering";
import {
  normalizeSubscriptionLifecycle,
  parsePolarSubscription,
} from "./billing/polar";

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function string(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function number(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function timestamp(value: unknown, fallback: number): number {
  if (typeof value !== "string") return fallback;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function findWorkspaceId(data: JsonObject): string | undefined {
  const metadata = object(data.metadata);
  const customer = object(data.customer);
  return (
    string(metadata?.baseblocks_workspace_id) ??
    string(data.external_customer_id) ??
    string(customer?.external_id)
  );
}

function normalizedOrderState(eventType: string, data: JsonObject) {
  if (eventType === "order.refunded") {
    const amounts = parsePolarOrderAmounts(data);
    const amount = amounts.grossMinor;
    const refunded = amounts.refundedGrossMinor;
    return refunded >= amount
      ? ("refunded" as const)
      : ("partiallyRefunded" as const);
  }
  if (eventType === "order.paid" || data.status === "paid")
    return "paid" as const;
  if (data.status === "failed") return "failed" as const;
  return "pending" as const;
}

function pastDueGraceEnabled(data: {
  normalizedStatus: string;
  pastDueAt?: number;
  now: number;
}) {
  if (data.normalizedStatus !== "grace") return false;
  const days = Number(process.env.BASEBLOCKS_PAST_DUE_GRACE_DAYS ?? "0");
  if (!Number.isSafeInteger(days) || days <= 0 || !data.pastDueAt) return false;
  return data.now <= data.pastDueAt + days * 86_400_000;
}

export const configureCatalogItem = internalMutation({
  args: {
    providerEnvironment: v.union(v.literal("sandbox"), v.literal("production")),
    sku: v.string(),
    kind: v.union(v.literal("plus"), v.literal("aiCreditPack")),
    providerProductId: v.string(),
    providerPriceId: v.optional(v.string()),
    recurringInterval: v.optional(
      v.union(v.literal("month"), v.literal("year")),
    ),
    priceAmountMinor: v.int64(),
    currency: v.string(),
    creditUnits: v.optional(v.int64()),
    configurationVersion: v.string(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const sku = args.sku.trim();
    if (!sku || !args.providerProductId.trim()) {
      throw new Error("Billing catalog identifiers cannot be empty");
    }
    if (args.priceAmountMinor < 0n || (args.creditUnits ?? 0n) < 0n) {
      throw new Error("Billing catalog quantities cannot be negative");
    }
    if (args.kind === "plus" && !args.recurringInterval) {
      throw new Error("Plus catalog products must define an interval");
    }
    if (args.kind === "aiCreditPack" && args.recurringInterval) {
      throw new Error("AI credit top-ups must use one-time custom pricing");
    }
    const existing = await ctx.db
      .query("billingCatalogItems")
      .withIndex("by_environment_sku", (q) =>
        q.eq("providerEnvironment", args.providerEnvironment).eq("sku", sku),
      )
      .unique();
    const now = Date.now();
    const value = {
      ...args,
      sku,
      planKey: args.kind === "plus" ? ("plus" as const) : undefined,
      updatedAt: now,
    };
    if (existing) await ctx.db.patch(existing._id, value);
    else
      await ctx.db.insert("billingCatalogItems", { ...value, createdAt: now });
    return null;
  },
});

export const getCatalogItem = internalQuery({
  args: {
    providerEnvironment: v.union(v.literal("sandbox"), v.literal("production")),
    sku: v.string(),
  },
  handler: async (ctx, args) =>
    await ctx.db
      .query("billingCatalogItems")
      .withIndex("by_environment_sku", (q) =>
        q
          .eq("providerEnvironment", args.providerEnvironment)
          .eq("sku", args.sku),
      )
      .unique(),
});

export const getCheckoutIntent = internalQuery({
  args: { intentId: v.id("billingCheckoutIntents") },
  handler: async (ctx, { intentId }) => await ctx.db.get(intentId),
});

export const getActiveSubscription = internalQuery({
  args: {
    organizationId: v.string(),
    providerEnvironment: v.union(v.literal("sandbox"), v.literal("production")),
  },
  handler: async (ctx, args) => {
    const subscriptions = await Promise.all(
      (["entitled", "grace", "pending"] as const).map((status) =>
        ctx.db
          .query("billingSubscriptions")
          .withIndex("by_organization_environment_status_updated", (q) =>
            q
              .eq("organizationId", args.organizationId)
              .eq("providerEnvironment", args.providerEnvironment)
              .eq("normalizedStatus", status),
          )
          .order("desc")
          .first(),
      ),
    );
    return (
      subscriptions
        .flatMap((subscription) => (subscription ? [subscription] : []))
        .sort((left, right) => right.updatedAt - left.updatedAt)[0] ?? null
    );
  },
});

export const terminateSubscriptionForWorkspaceDeletion = internalMutation({
  args: {
    organizationId: v.string(),
    subscriptionId: v.id("billingSubscriptions"),
    providerStatus: v.string(),
    providerModifiedAt: v.number(),
    endedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription || subscription.organizationId !== args.organizationId) {
      throw new Error("Billing subscription does not belong to this workspace");
    }
    const now = Date.now();
    await ctx.db.patch(subscription._id, {
      providerStatus: args.providerStatus,
      normalizedStatus: "terminated",
      cancelAtPeriodEnd: false,
      endedAt: args.endedAt ?? now,
      providerModifiedAt: Math.max(
        subscription.providerModifiedAt,
        args.providerModifiedAt,
      ),
      updatedAt: now,
    });
    const entitlement = await ctx.db
      .query("workspaceEntitlements")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .unique();
    if (entitlement) {
      await ctx.db.patch(entitlement._id, {
        plan: "free",
        subscriptionStatus: "terminated",
        statusReason: "workspace-deletion",
        plusEnabled: false,
        paidSeatCapacity: 0,
        effectiveThrough: args.endedAt ?? now,
        derivedAt: now,
        updatedAt: now,
      });
    }
    return null;
  },
});

export const listSeatReconciliationCandidates = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 25, 100));
    const [entitled, grace] = await Promise.all([
      ctx.db
        .query("billingSubscriptions")
        .withIndex("by_status_reconcile", (q) =>
          q.eq("normalizedStatus", "entitled"),
        )
        .take(limit),
      ctx.db
        .query("billingSubscriptions")
        .withIndex("by_status_reconcile", (q) =>
          q.eq("normalizedStatus", "grace"),
        )
        .take(limit),
    ]);
    return [...entitled, ...grace]
      .sort(
        (left, right) =>
          (left.lastReconciledAt ?? 0) - (right.lastReconciledAt ?? 0),
      )
      .slice(0, limit);
  },
});

export const getCustomer = internalQuery({
  args: {
    organizationId: v.string(),
    providerEnvironment: v.union(v.literal("sandbox"), v.literal("production")),
  },
  handler: async (ctx, args) =>
    await ctx.db
      .query("billingCustomers")
      .withIndex("by_organization_environment", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("providerEnvironment", args.providerEnvironment),
      )
      .unique(),
});

export const recordCustomer = internalMutation({
  args: {
    organizationId: v.string(),
    providerEnvironment: v.union(v.literal("sandbox"), v.literal("production")),
    providerCustomerId: v.string(),
    externalCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("billingCustomers")
      .withIndex("by_organization_environment", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("providerEnvironment", args.providerEnvironment),
      )
      .unique();
    const now = Date.now();
    const value = {
      provider: "polar" as const,
      organizationId: args.organizationId,
      providerEnvironment: args.providerEnvironment,
      providerCustomerId: args.providerCustomerId,
      externalCustomerId: args.externalCustomerId,
      lastSyncedAt: now,
      lastErrorCode: undefined,
      updatedAt: now,
    };
    if (existing) await ctx.db.patch(existing._id, value);
    else await ctx.db.insert("billingCustomers", { ...value, createdAt: now });
    return null;
  },
});

export const createCheckoutIntent = internalMutation({
  args: {
    organizationId: v.string(),
    actorId: v.string(),
    providerEnvironment: v.union(v.literal("sandbox"), v.literal("production")),
    purpose: v.union(v.literal("plus"), v.literal("aiCreditPack")),
    sku: v.string(),
    requestedSeats: v.optional(v.number()),
    requestedAmountMinor: v.optional(v.int64()),
    idempotencyKey: v.string(),
    attemptId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("billingCheckoutIntents")
      .withIndex("by_organization_idempotency", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("idempotencyKey", args.idempotencyKey),
      )
      .unique();
    if (existing) {
      if (
        existing.actorId !== args.actorId ||
        existing.providerEnvironment !== args.providerEnvironment ||
        existing.purpose !== args.purpose ||
        existing.sku !== args.sku ||
        existing.requestedSeats !== args.requestedSeats ||
        existing.requestedAmountMinor !== args.requestedAmountMinor
      ) {
        throw new ConvexError({
          code: "BILLING_IDEMPOTENCY_CONFLICT",
          message: "Checkout key was already used for another operation",
        });
      }
      const now = Date.now();
      if (!checkoutAttemptCanAcquire(existing, args.attemptId, now)) {
        return existing;
      }
      const shouldReplay = checkoutAttemptShouldReplay(existing, now);
      await ctx.db.patch(existing._id, {
        status: "pending",
        providerCheckoutId: shouldReplay
          ? existing.providerCheckoutId
          : undefined,
        expiresAt: shouldReplay ? existing.expiresAt : undefined,
        failureCode: undefined,
        nextAttemptAt: undefined,
        activeAttemptId: args.attemptId,
        leaseExpiresAt: now + CHECKOUT_ATTEMPT_LEASE_MS,
        attemptCount: (existing.attemptCount ?? 0) + 1,
        updatedAt: now,
      });
      return await ctx.db.get(existing._id);
    }
    const now = Date.now();
    const id = await ctx.db.insert(
      "billingCheckoutIntents",
      newCheckoutIntentDocument(args, now),
    );
    return await ctx.db.get(id);
  },
});

export const recordCheckoutCreated = internalMutation({
  args: {
    intentId: v.id("billingCheckoutIntents"),
    providerCheckoutId: v.string(),
    expiresAt: v.number(),
    attemptId: v.string(),
  },
  handler: async (ctx, args) => {
    const intent = await ctx.db.get(args.intentId);
    if (!intent) throw new Error("Billing checkout intent not found");
    if (
      intent.status !== "pending" ||
      intent.activeAttemptId !== args.attemptId
    ) {
      throw new ConvexError({
        code: "BILLING_ATTEMPT_SUPERSEDED",
        message: "Checkout attempt is no longer active",
      });
    }
    if (
      intent.providerCheckoutId &&
      intent.providerCheckoutId !== args.providerCheckoutId
    ) {
      throw new ConvexError({
        code: "BILLING_IDEMPOTENCY_CONFLICT",
        message: "Checkout intent was linked to another provider checkout",
      });
    }
    await ctx.db.patch(intent._id, {
      providerCheckoutId: args.providerCheckoutId,
      status: "created",
      expiresAt: args.expiresAt,
      activeAttemptId: undefined,
      leaseExpiresAt: undefined,
      nextAttemptAt: undefined,
      failureCode: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const recordCheckoutFailed = internalMutation({
  args: {
    intentId: v.id("billingCheckoutIntents"),
    failureCode: v.string(),
    attemptId: v.string(),
    retryable: v.boolean(),
    retryAfterMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const intent = await ctx.db.get(args.intentId);
    if (
      intent &&
      intent.status === "pending" &&
      intent.activeAttemptId === args.attemptId
    ) {
      const now = Date.now();
      await ctx.db.patch(intent._id, {
        status: args.retryable ? "retryable" : "failed",
        failureCode: args.failureCode.slice(0, 100),
        activeAttemptId: undefined,
        leaseExpiresAt: undefined,
        nextAttemptAt: args.retryable
          ? boundedCheckoutRetryAt(now, args.retryAfterMs)
          : undefined,
        updatedAt: now,
      });
    }
    return null;
  },
});

export const recordSeatSnapshot = internalMutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    if (
      !Number.isSafeInteger(args.billableSeatCount) ||
      args.billableSeatCount < 1 ||
      args.memberIds.length !== args.billableSeatCount ||
      new Set(args.memberIds).size !== args.billableSeatCount
    ) {
      throw new Error("Invalid billable seat snapshot");
    }
    const duplicate = await ctx.db
      .query("billingSeatSnapshots")
      .withIndex("by_membership_revision", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("membershipRevision", args.membershipRevision),
      )
      .first();
    if (duplicate) return duplicate._id;
    return await ctx.db.insert("billingSeatSnapshots", {
      ...args,
      memberIds: [...new Set(args.memberIds)].sort(),
      observedAt: Date.now(),
    });
  },
});

export const createSeatSyncOperation = internalMutation({
  args: {
    organizationId: v.string(),
    subscriptionId: v.id("billingSubscriptions"),
    membershipRevision: v.string(),
    previousSeats: v.number(),
    targetSeats: v.number(),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    for (const seats of [args.previousSeats, args.targetSeats]) {
      if (!Number.isSafeInteger(seats) || seats < 1) {
        throw new Error("Seat quantities must be positive integers");
      }
    }
    const existing = await ctx.db
      .query("billingSeatSyncOperations")
      .withIndex("by_organization_idempotency", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("idempotencyKey", args.idempotencyKey),
      )
      .unique();
    if (existing) {
      if (
        existing.subscriptionId !== args.subscriptionId ||
        existing.membershipRevision !== args.membershipRevision ||
        existing.targetSeats !== args.targetSeats
      ) {
        throw new ConvexError({
          code: "BILLING_IDEMPOTENCY_CONFLICT",
          message: "Seat sync key was already used for another operation",
        });
      }
      return existing;
    }
    const now = Date.now();
    const id = await ctx.db.insert("billingSeatSyncOperations", {
      ...args,
      status: "pending",
      attemptCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.get(id);
  },
});

export const completeSeatSyncOperation = internalMutation({
  args: {
    operationId: v.id("billingSeatSyncOperations"),
    providerModifiedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const operation = await ctx.db.get(args.operationId);
    if (!operation) throw new Error("Seat sync operation not found");
    await ctx.db.patch(operation._id, {
      status: "applied",
      providerModifiedAt: args.providerModifiedAt,
      leaseExpiresAt: undefined,
      failureCode: undefined,
      updatedAt: Date.now(),
    });
    const subscription = await ctx.db.get(operation.subscriptionId);
    if (subscription) {
      await ctx.db.patch(subscription._id, {
        seatQuantity: operation.targetSeats,
        providerModifiedAt: args.providerModifiedAt,
        lastReconciledAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const failSeatSyncOperation = internalMutation({
  args: {
    operationId: v.id("billingSeatSyncOperations"),
    failureCode: v.string(),
  },
  handler: async (ctx, args) => {
    const operation = await ctx.db.get(args.operationId);
    if (!operation || operation.status === "applied") return null;
    await ctx.db.patch(operation._id, {
      status: "failed",
      attemptCount: operation.attemptCount + 1,
      nextAttemptAt: Date.now() + 60_000,
      failureCode: args.failureCode.slice(0, 100),
      leaseExpiresAt: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const ingestWebhook = internalMutation({
  args: {
    providerEnvironment: v.union(v.literal("sandbox"), v.literal("production")),
    deliveryId: v.string(),
    eventType: v.string(),
    eventOccurredAt: v.number(),
    providerModifiedAt: v.optional(v.number()),
    resourceType: v.optional(v.string()),
    resourceId: v.optional(v.string()),
    organizationId: v.optional(v.string()),
    providerCustomerId: v.optional(v.string()),
    providerSubscriptionId: v.optional(v.string()),
    providerOrderId: v.optional(v.string()),
    payloadHash: v.string(),
    rawPayload: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("billingWebhookEvents")
      .withIndex("by_environment_delivery", (q) =>
        q
          .eq("providerEnvironment", args.providerEnvironment)
          .eq("deliveryId", args.deliveryId),
      )
      .unique();
    if (existing) {
      if (existing.payloadHash !== args.payloadHash) {
        throw new ConvexError({
          code: "WEBHOOK_REPLAY_CONFLICT",
          message: "Webhook delivery ID was replayed with a different payload",
        });
      }
      return { eventId: existing._id, duplicate: true };
    }
    const now = Date.now();
    const eventId = await ctx.db.insert("billingWebhookEvents", {
      provider: "polar",
      ...args,
      status: "pending",
      attemptCount: 0,
      receivedAt: now,
      updatedAt: now,
    });
    return { eventId, duplicate: false };
  },
});

async function upsertSubscription(
  ctx: MutationCtx,
  event: Doc<"billingWebhookEvents">,
  data: JsonObject,
  organizationId: string,
) {
  const subscription = parsePolarSubscription(data);
  const lifecycle = normalizeSubscriptionLifecycle(subscription);
  const providerModifiedAt = timestamp(
    subscription.modifiedAt,
    event.providerModifiedAt ?? event.eventOccurredAt,
  );
  const existing = await ctx.db
    .query("billingSubscriptions")
    .withIndex("by_provider_subscription", (q) =>
      q
        .eq("providerEnvironment", event.providerEnvironment)
        .eq("providerSubscriptionId", subscription.id),
    )
    .unique();
  if (
    existing &&
    !shouldApplyProviderUpdate(existing.providerModifiedAt, providerModifiedAt)
  )
    return existing;
  const catalog = await ctx.db
    .query("billingCatalogItems")
    .withIndex("by_environment_product", (q) =>
      q
        .eq("providerEnvironment", event.providerEnvironment)
        .eq("providerProductId", subscription.productId),
    )
    .first();
  if (catalog?.kind !== "plus" || !catalog.recurringInterval) {
    return null;
  }
  await upsertCustomerFromWebhook(
    ctx,
    event.providerEnvironment,
    organizationId,
    subscription.customerId,
  );
  const pendingUpdate = object(subscription.pendingUpdate);
  const now = Date.now();
  const value = {
    organizationId,
    providerEnvironment: event.providerEnvironment,
    providerSubscriptionId: subscription.id,
    providerCustomerId: subscription.customerId,
    providerProductId: subscription.productId,
    providerPriceId: catalog.providerPriceId,
    planKey: "plus" as const,
    recurringInterval: catalog.recurringInterval,
    providerStatus: subscription.status,
    normalizedStatus: lifecycle.state,
    seatQuantity: Math.max(1, subscription.seats ?? 1),
    pendingSeatQuantity: number(pendingUpdate?.seats),
    pendingProductId: string(pendingUpdate?.product_id),
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    currentPeriodStart: timestamp(subscription.currentPeriodStart, now),
    currentPeriodEnd: timestamp(subscription.currentPeriodEnd, now),
    pastDueAt: subscription.pastDueAt
      ? timestamp(subscription.pastDueAt, now)
      : undefined,
    canceledAt: subscription.canceledAt
      ? timestamp(subscription.canceledAt, now)
      : undefined,
    endedAt: subscription.endedAt
      ? timestamp(subscription.endedAt, now)
      : undefined,
    providerModifiedAt,
    latestEventOccurredAt: event.eventOccurredAt,
    latestWebhookDeliveryId: event.deliveryId,
    updatedAt: now,
  };
  const subscriptionId = existing?._id;
  if (existing) await ctx.db.patch(existing._id, value);
  else {
    const inserted = await ctx.db.insert("billingSubscriptions", {
      ...value,
      createdAt: now,
    });
    const created = await ctx.db.get(inserted);
    if (!created) throw new Error("Subscription insert failed");
    await deriveEntitlement(ctx, event._id, created);
    return created;
  }
  const updated = subscriptionId ? await ctx.db.get(subscriptionId) : null;
  if (updated) await deriveEntitlement(ctx, event._id, updated);
  return updated;
}

async function upsertCustomerFromWebhook(
  ctx: MutationCtx,
  providerEnvironment: "sandbox" | "production",
  organizationId: string,
  providerCustomerId: string,
) {
  const existing = await ctx.db
    .query("billingCustomers")
    .withIndex("by_organization_environment", (q) =>
      q
        .eq("organizationId", organizationId)
        .eq("providerEnvironment", providerEnvironment),
    )
    .unique();
  const now = Date.now();
  const value = {
    organizationId,
    provider: "polar" as const,
    providerEnvironment,
    providerCustomerId,
    externalCustomerId: organizationId,
    lastSyncedAt: now,
    lastErrorCode: undefined,
    updatedAt: now,
  };
  if (existing) await ctx.db.patch(existing._id, value);
  else await ctx.db.insert("billingCustomers", { ...value, createdAt: now });
}

async function deriveEntitlement(
  ctx: MutationCtx,
  eventId: Id<"billingWebhookEvents">,
  subscription: Doc<"billingSubscriptions">,
) {
  const latestSeatSnapshot = await ctx.db
    .query("billingSeatSnapshots")
    .withIndex("by_organization_observed", (q) =>
      q.eq("organizationId", subscription.organizationId),
    )
    .order("desc")
    .first();
  const now = Date.now();
  const plusEnabled =
    subscription.normalizedStatus === "entitled" ||
    pastDueGraceEnabled({
      normalizedStatus: subscription.normalizedStatus,
      pastDueAt: subscription.pastDueAt,
      now,
    });
  const existing = await ctx.db
    .query("workspaceEntitlements")
    .withIndex("by_organization", (q) =>
      q.eq("organizationId", subscription.organizationId),
    )
    .unique();
  const value = {
    organizationId: subscription.organizationId,
    plan: plusEnabled ? ("plus" as const) : ("free" as const),
    subscriptionStatus: subscription.normalizedStatus,
    statusReason: `polar:${subscription.providerStatus}`,
    plusEnabled,
    paidSeatCapacity: subscription.seatQuantity,
    billableSeatCount: Math.max(1, latestSeatSnapshot?.billableSeatCount ?? 1),
    sourceSubscriptionId: subscription._id,
    sourceEventId: eventId,
    effectiveFrom: subscription.currentPeriodStart,
    effectiveThrough:
      subscription.cancelAtPeriodEnd || !plusEnabled
        ? subscription.currentPeriodEnd
        : undefined,
    policyVersion: "polar-entitlements-v1",
    derivedAt: now,
    updatedAt: now,
  };
  if (existing) await ctx.db.patch(existing._id, value);
  else await ctx.db.insert("workspaceEntitlements", value);
}

async function processOrder(
  ctx: MutationCtx,
  event: Doc<"billingWebhookEvents">,
  data: JsonObject,
  organizationId: string,
) {
  const providerOrderId = string(data.id);
  const providerProductId =
    string(data.product_id) ?? string(object(data.product)?.id);
  const providerCustomerId =
    string(data.customer_id) ?? string(object(data.customer)?.id);
  if (!providerOrderId || !providerProductId || !providerCustomerId) {
    throw new Error("Polar order webhook omitted required identifiers");
  }
  const catalog = await ctx.db
    .query("billingCatalogItems")
    .withIndex("by_environment_product", (q) =>
      q
        .eq("providerEnvironment", event.providerEnvironment)
        .eq("providerProductId", providerProductId),
    )
    .first();
  if (!catalog) return null;
  const amounts = parsePolarOrderAmounts(data);
  const state = normalizedOrderState(event.eventType, data);
  // Polar can emit a negative subscription_update order for a downgrade or
  // proration credit. Keep that signed order for reconciliation, but never
  // treat it as a paid credit grant.
  const grossAmountMinor = amounts.grossMinor;
  const refundedGrossAmountMinor = amounts.refundedGrossMinor;
  const existing = await ctx.db
    .query("billingOrders")
    .withIndex("by_provider_order", (q) =>
      q
        .eq("providerEnvironment", event.providerEnvironment)
        .eq("providerOrderId", providerOrderId),
    )
    .unique();
  const now = Date.now();
  const providerModifiedAt = timestamp(data.modified_at, event.eventOccurredAt);
  if (
    existing &&
    !shouldApplyProviderUpdate(existing.providerModifiedAt, providerModifiedAt)
  ) {
    return existing._id;
  }
  const providerSubscriptionId = string(data.subscription_id);
  const billingReason = string(data.billing_reason);
  const value = {
    organizationId,
    providerEnvironment: event.providerEnvironment,
    providerOrderId,
    providerCheckoutId: string(data.checkout_id),
    providerCustomerId,
    providerSubscriptionId,
    providerProductId,
    kind:
      catalog.kind === "aiCreditPack"
        ? ("prepaid" as const)
        : ("subscription" as const),
    state,
    subtotalAmountMinor: amounts.subtotalMinor,
    discountAmountMinor: amounts.discountMinor,
    taxAmountMinor: amounts.taxMinor,
    grossAmountMinor: amounts.grossMinor,
    netAmountMinor: amounts.netMinor,
    refundedGrossAmountMinor: amounts.refundedGrossMinor,
    currency: string(data.currency) ?? catalog.currency,
    billingReason,
    providerModifiedAt,
    updatedAt: now,
  };
  let orderId = existing?._id;
  if (existing) await ctx.db.patch(existing._id, value);
  else {
    orderId = await ctx.db.insert("billingOrders", {
      ...value,
      createdAt: now,
    });
  }
  await upsertCustomerFromWebhook(
    ctx,
    event.providerEnvironment,
    organizationId,
    providerCustomerId,
  );
  const providerCheckoutId = string(data.checkout_id);
  if (providerCheckoutId) {
    const intent = await ctx.db
      .query("billingCheckoutIntents")
      .withIndex("by_provider_checkout", (q) =>
        q
          .eq("providerEnvironment", event.providerEnvironment)
          .eq("providerCheckoutId", providerCheckoutId),
      )
      .unique();
    if (intent && intent.status !== "completed") {
      await ctx.db.patch(intent._id, { status: "completed", updatedAt: now });
    }
  }
  if (
    state === "paid" &&
    grossAmountMinor > 0n &&
    (catalog.kind === "aiCreditPack" ||
      (catalog.creditUnits !== undefined && catalog.creditUnits > 0n))
  ) {
    if (catalog.kind === "aiCreditPack") {
      const grantedUnits = aiTopUpAmountToCreditUnits(grossAmountMinor);
      const grant = {
        organizationId,
        bucket: "prepaid",
        sourceKind: "purchase",
        sourceRef: `prepaid:${providerOrderId}`,
        units: grantedUnits,
        policyVersion: catalog.configurationVersion,
        billingEventId: event._id,
        now,
      } as const;
      const lotId = await grantAiCredits(ctx, grant);
      await reconcileAiCreditGrantUpward(ctx, grant);
      if (orderId) await ctx.db.patch(orderId, { creditLotId: lotId });
    } else if (providerSubscriptionId) {
      const recurringUnits = catalog.creditUnits;
      if (!recurringUnits || recurringUnits <= 0n) {
        throw new Error("Plus catalog item has no included AI credits");
      }
      const subscription = await ctx.db
        .query("billingSubscriptions")
        .withIndex("by_provider_subscription", (q) =>
          q
            .eq("providerEnvironment", event.providerEnvironment)
            .eq("providerSubscriptionId", providerSubscriptionId),
        )
        .unique();
      if (subscription?.normalizedStatus !== "entitled") {
        throw new Error(
          "Paid subscription order is waiting for authoritative subscription state",
        );
      }
      if (billingReason === "subscription_update") {
        await replaceUnusedIncludedCreditLots(ctx, {
          organizationId,
          replacementRef: providerOrderId,
          preserveSourceRef: `included:${providerSubscriptionId}:${subscription.currentPeriodStart}`,
          policyVersion: catalog.configurationVersion,
          billingEventId: event._id,
          now,
        });
      }
      await grantAiCredits(ctx, {
        organizationId,
        bucket: "included",
        sourceKind: "recurring",
        sourceRef: `included:${providerSubscriptionId}:${subscription.currentPeriodStart}`,
        units: recurringUnits,
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
        expiresAt: subscription.currentPeriodEnd,
        policyVersion: catalog.configurationVersion,
        billingEventId: event._id,
        now,
      });
    }
  }
  if (
    (state === "refunded" || state === "partiallyRefunded") &&
    catalog.kind === "aiCreditPack" &&
    grossAmountMinor > 0n
  ) {
    const targetRevokedUnits = moneyAmountMinorToCreditUnits(
      refundedGrossAmountMinor,
    );
    await revokeAiCreditGrant(ctx, {
      organizationId,
      sourceRef: `prepaid:${providerOrderId}`,
      targetRevokedUnits,
      policyVersion: catalog.configurationVersion,
      billingEventId: event._id,
      now,
    });
  }
  return orderId;
}

export const processWebhook = internalMutation({
  args: { eventId: v.id("billingWebhookEvents") },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);
    if (!event || event.status === "processed" || event.status === "ignored") {
      return null;
    }
    const now = Date.now();
    if (
      event.status === "processing" &&
      event.leaseExpiresAt !== undefined &&
      event.leaseExpiresAt > now
    ) {
      return null;
    }
    await ctx.db.patch(event._id, {
      status: "processing",
      attemptCount: event.attemptCount + 1,
      leaseExpiresAt: now + 60_000,
      nextAttemptAt: now + 60_000,
      updatedAt: now,
    });
    try {
      const payload = object(event.payload);
      const data = object(payload?.data);
      if (!data) throw new Error("Polar webhook omitted data");
      const organizationId = event.organizationId ?? findWorkspaceId(data);
      if (!organizationId) {
        await ctx.db.patch(event._id, {
          status: "ignored",
          failureCode: "WORKSPACE_ID_MISSING",
          processedAt: now,
          leaseExpiresAt: undefined,
          updatedAt: now,
        });
        return null;
      }
      const organization = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "organization",
          where: [{ field: "_id", operator: "eq", value: organizationId }],
        },
      );
      if (!organization) {
        await ctx.db.patch(event._id, {
          status: "ignored",
          organizationId,
          failureCode: "WORKSPACE_DELETED",
          processedAt: now,
          leaseExpiresAt: undefined,
          nextAttemptAt: undefined,
          updatedAt: now,
        });
        return null;
      }
      if (event.eventType.startsWith("subscription.")) {
        await upsertSubscription(ctx, event, data, organizationId);
      } else if (event.eventType.startsWith("order.")) {
        await processOrder(ctx, event, data, organizationId);
      } else {
        await ctx.db.patch(event._id, {
          status: "ignored",
          failureCode: "EVENT_NOT_APPLICABLE",
          processedAt: now,
          leaseExpiresAt: undefined,
          updatedAt: now,
        });
        return null;
      }
      await ctx.db.patch(event._id, {
        status: "processed",
        organizationId,
        processedAt: Date.now(),
        leaseExpiresAt: undefined,
        nextAttemptAt: undefined,
        failureCode: undefined,
        failureMessage: undefined,
        updatedAt: Date.now(),
      });
    } catch (error) {
      const retryDelay = Math.min(
        60 * 60_000,
        60_000 * 2 ** Math.min(event.attemptCount, 6),
      );
      await ctx.db.patch(event._id, {
        status: "failed",
        leaseExpiresAt: undefined,
        nextAttemptAt: Date.now() + retryDelay,
        failureCode: "PROCESSING_FAILED",
        failureMessage:
          error instanceof Error
            ? error.message.slice(0, 1_000)
            : "Unknown error",
        updatedAt: Date.now(),
      });
      await ctx.scheduler.runAfter(
        retryDelay,
        internal.billingModel.processWebhook,
        { eventId: event._id },
      );
    }
    return null;
  },
});

export const recoverWebhookEvents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const [failed, stalled] = await Promise.all([
      ctx.db
        .query("billingWebhookEvents")
        .withIndex("by_status_retry", (q) =>
          q.eq("status", "failed").lte("nextAttemptAt", now),
        )
        .take(50),
      ctx.db
        .query("billingWebhookEvents")
        .withIndex("by_status_retry", (q) =>
          q.eq("status", "processing").lte("nextAttemptAt", now),
        )
        .take(50),
    ]);
    for (const event of [...failed, ...stalled]) {
      await ctx.scheduler.runAfter(0, internal.billingModel.processWebhook, {
        eventId: event._id,
      });
    }
    return failed.length + stalled.length;
  },
});
