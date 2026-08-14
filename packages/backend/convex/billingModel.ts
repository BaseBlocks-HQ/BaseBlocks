import { ConvexError, v } from "convex/values";
import {
  boundedCheckoutRetryAt,
  CHECKOUT_ATTEMPT_LEASE_MS,
  checkoutAttemptCanAcquire,
  checkoutAttemptShouldReplay,
  newCheckoutIntentDocument,
} from "./billing/checkoutIntent";
import { internalMutation, internalQuery } from "./_generated/server";

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
