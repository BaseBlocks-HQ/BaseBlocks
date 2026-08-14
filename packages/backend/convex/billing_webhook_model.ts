import {
  aiTopUpAmountToCreditUnits,
  moneyAmountMinorToCreditUnits,
} from "@baseblocks/domain";
import { type Infer, v } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { normalizeSubscriptionLifecycle } from "./billing/polar";
import {
  grantAiCredits,
  reconcileAiCreditGrantUpward,
  replaceUnusedIncludedCreditLots,
  revokeAiCreditGrant,
} from "./model/aiCredits";

const providerEnvironment = v.union(
  v.literal("sandbox"),
  v.literal("production"),
);
const orderEvent = v.object({
  kind: v.literal("order"),
  organizationId: v.string(),
  providerOrderId: v.string(),
  providerCheckoutId: v.optional(v.string()),
  providerCustomerId: v.string(),
  providerSubscriptionId: v.optional(v.string()),
  providerProductId: v.string(),
  state: v.union(
    v.literal("pending"),
    v.literal("paid"),
    v.literal("refunded"),
    v.literal("partiallyRefunded"),
    v.literal("failed"),
  ),
  subtotalAmountMinor: v.int64(),
  discountAmountMinor: v.int64(),
  taxAmountMinor: v.int64(),
  grossAmountMinor: v.int64(),
  netAmountMinor: v.int64(),
  refundedGrossAmountMinor: v.int64(),
  currency: v.string(),
  billingReason: v.optional(v.string()),
  providerModifiedAt: v.number(),
});
const subscriptionEvent = v.object({
  kind: v.literal("subscription"),
  organizationId: v.string(),
  providerSubscriptionId: v.string(),
  providerCustomerId: v.string(),
  providerProductId: v.string(),
  providerStatus: v.string(),
  seatQuantity: v.number(),
  pendingSeatQuantity: v.optional(v.number()),
  pendingProductId: v.optional(v.string()),
  cancelAtPeriodEnd: v.boolean(),
  pauseAtPeriodEnd: v.optional(v.boolean()),
  currentPeriodStart: v.number(),
  currentPeriodEnd: v.number(),
  pastDueAt: v.optional(v.number()),
  canceledAt: v.optional(v.number()),
  endedAt: v.optional(v.number()),
  providerModifiedAt: v.number(),
});
const commandValidator = {
  providerEnvironment,
  deliveryId: v.string(),
  eventType: v.union(
    v.literal("order.created"),
    v.literal("order.updated"),
    v.literal("order.paid"),
    v.literal("order.refunded"),
    v.literal("subscription.active"),
    v.literal("subscription.canceled"),
    v.literal("subscription.created"),
    v.literal("subscription.past_due"),
    v.literal("subscription.revoked"),
    v.literal("subscription.uncanceled"),
    v.literal("subscription.updated"),
  ),
  eventOccurredAt: v.number(),
  event: v.union(orderEvent, subscriptionEvent),
};

type PolarOrderEvent = Infer<typeof orderEvent>;
type PolarSubscriptionEvent = Infer<typeof subscriptionEvent>;
export type PolarBillingEventCommand = Readonly<{
  [Key in keyof typeof commandValidator]: Infer<(typeof commandValidator)[Key]>;
}>;

function assertEventTypeMatchesResource(command: PolarBillingEventCommand) {
  if (
    (command.event.kind === "order" &&
      !command.eventType.startsWith("order.")) ||
    (command.event.kind === "subscription" &&
      !command.eventType.startsWith("subscription."))
  ) {
    throw new Error("Polar event type does not match its billing resource");
  }
}

function pastDueGraceEnabled(data: {
  normalizedStatus: string;
  pastDueAt?: number;
  now: number;
}) {
  if (data.normalizedStatus !== "grace") return false;
  const days = Number(process.env.BASEBLOCKS_PAST_DUE_GRACE_DAYS ?? "0");
  return (
    Number.isSafeInteger(days) &&
    days > 0 &&
    data.pastDueAt !== undefined &&
    data.now <= data.pastDueAt + days * 86_400_000
  );
}

function resourceId(event: PolarOrderEvent | PolarSubscriptionEvent) {
  return event.kind === "order"
    ? event.providerOrderId
    : event.providerSubscriptionId;
}

async function upsertCustomer(
  ctx: MutationCtx,
  command: PolarBillingEventCommand,
) {
  const existing = await ctx.db
    .query("billingCustomers")
    .withIndex("by_organization_environment", (query) =>
      query
        .eq("organizationId", command.event.organizationId)
        .eq("providerEnvironment", command.providerEnvironment),
    )
    .unique();
  const now = Date.now();
  const value = {
    organizationId: command.event.organizationId,
    provider: "polar" as const,
    providerEnvironment: command.providerEnvironment,
    providerCustomerId: command.event.providerCustomerId,
    externalCustomerId: command.event.organizationId,
    lastSyncedAt: now,
    lastErrorCode: undefined,
    updatedAt: now,
  };
  if (existing) await ctx.db.patch(existing._id, value);
  else await ctx.db.insert("billingCustomers", { ...value, createdAt: now });
}

export async function applyPolarBillingEvent(
  ctx: MutationCtx,
  command: PolarBillingEventCommand,
) {
  assertEventTypeMatchesResource(command);
  const existingDelivery = await ctx.db
    .query("billingWebhookEvents")
    .withIndex("by_environment_delivery", (query) =>
      query
        .eq("providerEnvironment", command.providerEnvironment)
        .eq("deliveryId", command.deliveryId),
    )
    .unique();
  if (existingDelivery) {
    if (
      existingDelivery.eventType !== command.eventType ||
      existingDelivery.resourceId !== resourceId(command.event)
    ) {
      throw new Error("Polar delivery ID was reused for another event");
    }
    return {
      outcome: "duplicate" as const,
      eventType: command.eventType,
      resourceId: resourceId(command.event),
    };
  }

  const workspace = await ctx.db
    .query("workspaceProfiles")
    .withIndex("by_organization", (query) =>
      query.eq("organizationId", command.event.organizationId),
    )
    .unique();
  if (!workspace) {
    const now = Date.now();
    await ctx.db.insert("billingWebhookEvents", {
      providerEnvironment: command.providerEnvironment,
      deliveryId: command.deliveryId,
      eventType: command.eventType,
      eventOccurredAt: command.eventOccurredAt,
      resourceId: resourceId(command.event),
      organizationId: command.event.organizationId,
      outcome: "ignored",
      ignoredReason: "workspace_not_found",
      receivedAt: now,
      processedAt: now,
    });
    return {
      outcome: "ignored" as const,
      eventType: command.eventType,
      resourceId: resourceId(command.event),
    };
  }

  const catalog = await ctx.db
    .query("billingCatalogItems")
    .withIndex("by_environment_product", (query) =>
      query
        .eq("providerEnvironment", command.providerEnvironment)
        .eq("providerProductId", command.event.providerProductId),
    )
    .first();
  if (!catalog) {
    throw new Error("Polar event references an unknown billing product");
  }

  const now = Date.now();
  const billingEventId = await ctx.db.insert("billingWebhookEvents", {
    providerEnvironment: command.providerEnvironment,
    deliveryId: command.deliveryId,
    eventType: command.eventType,
    eventOccurredAt: command.eventOccurredAt,
    resourceId: resourceId(command.event),
    organizationId: command.event.organizationId,
    outcome: "applied",
    receivedAt: now,
    processedAt: now,
  });

  if (command.event.kind === "subscription") {
    if (catalog.kind !== "plus" || !catalog.recurringInterval) {
      throw new Error("Polar subscription references a non-recurring product");
    }
    const lifecycle = normalizeSubscriptionLifecycle({
      status: command.event.providerStatus,
      cancelAtPeriodEnd: command.event.cancelAtPeriodEnd,
      pauseAtPeriodEnd: command.event.pauseAtPeriodEnd ?? false,
      currentPeriodEnd: new Date(command.event.currentPeriodEnd).toISOString(),
      endedAt: command.event.endedAt
        ? new Date(command.event.endedAt).toISOString()
        : null,
    });
    const existingSubscription = await ctx.db
      .query("billingSubscriptions")
      .withIndex("by_provider_subscription", (query) =>
        query
          .eq("providerEnvironment", command.providerEnvironment)
          .eq("providerSubscriptionId", command.event.providerSubscriptionId!),
      )
      .unique();
    if (
      existingSubscription &&
      command.event.providerModifiedAt < existingSubscription.providerModifiedAt
    ) {
      await ctx.db.patch(billingEventId, {
        outcome: "ignored",
        ignoredReason: "stale_provider_update",
      });
      return {
        outcome: "ignored" as const,
        eventType: command.eventType,
        resourceId: command.event.providerSubscriptionId,
      };
    }
    await upsertCustomer(ctx, command);
    const subscriptionValue = {
      organizationId: command.event.organizationId,
      providerEnvironment: command.providerEnvironment,
      providerSubscriptionId: command.event.providerSubscriptionId,
      providerCustomerId: command.event.providerCustomerId,
      providerProductId: command.event.providerProductId,
      providerPriceId: catalog.providerPriceId,
      planKey: "plus" as const,
      recurringInterval: catalog.recurringInterval,
      providerStatus: command.event.providerStatus,
      normalizedStatus: lifecycle.state,
      seatQuantity: Math.max(1, command.event.seatQuantity),
      pendingSeatQuantity: command.event.pendingSeatQuantity,
      pendingProductId: command.event.pendingProductId,
      cancelAtPeriodEnd: command.event.cancelAtPeriodEnd,
      currentPeriodStart: command.event.currentPeriodStart,
      currentPeriodEnd: command.event.currentPeriodEnd,
      pastDueAt: command.event.pastDueAt,
      canceledAt: command.event.canceledAt,
      endedAt: command.event.endedAt,
      providerModifiedAt: command.event.providerModifiedAt,
      latestEventOccurredAt: command.eventOccurredAt,
      latestWebhookDeliveryId: command.deliveryId,
      updatedAt: now,
    };
    let subscriptionId = existingSubscription?._id;
    if (
      existingSubscription &&
      command.event.providerModifiedAt >=
        existingSubscription.providerModifiedAt
    ) {
      await ctx.db.patch(existingSubscription._id, subscriptionValue);
    } else if (!existingSubscription) {
      subscriptionId = await ctx.db.insert("billingSubscriptions", {
        ...subscriptionValue,
        createdAt: now,
      });
    }
    if (!subscriptionId) throw new Error("Polar subscription was not stored");
    const latestSeatSnapshot = await ctx.db
      .query("billingSeatSnapshots")
      .withIndex("by_organization_observed", (query) =>
        query.eq("organizationId", command.event.organizationId),
      )
      .order("desc")
      .first();
    const entitlement = await ctx.db
      .query("workspaceEntitlements")
      .withIndex("by_organization", (query) =>
        query.eq("organizationId", command.event.organizationId),
      )
      .unique();
    const plusEnabled =
      lifecycle.state === "entitled" ||
      pastDueGraceEnabled({
        normalizedStatus: lifecycle.state,
        pastDueAt: command.event.pastDueAt,
        now,
      });
    const entitlementValue = {
      organizationId: command.event.organizationId,
      plan: plusEnabled ? ("plus" as const) : ("free" as const),
      subscriptionStatus: lifecycle.state,
      statusReason: `polar:${command.event.providerStatus}`,
      plusEnabled,
      paidSeatCapacity: Math.max(1, command.event.seatQuantity),
      billableSeatCount: Math.max(
        1,
        latestSeatSnapshot?.billableSeatCount ?? 1,
      ),
      sourceSubscriptionId: subscriptionId,
      sourceEventId: billingEventId,
      effectiveFrom: command.event.currentPeriodStart,
      effectiveThrough:
        command.event.cancelAtPeriodEnd || !plusEnabled
          ? command.event.currentPeriodEnd
          : undefined,
      policyVersion: "polar-entitlements-v1",
      derivedAt: now,
      updatedAt: now,
    };
    if (entitlement) await ctx.db.patch(entitlement._id, entitlementValue);
    else {
      await ctx.db.insert("workspaceEntitlements", entitlementValue);
    }
    return {
      outcome: "applied" as const,
      eventType: command.eventType,
      resourceId: command.event.providerSubscriptionId,
    };
  }

  const orderEvent = command.event;
  const existingOrder = await ctx.db
    .query("billingOrders")
    .withIndex("by_provider_order", (query) =>
      query
        .eq("providerEnvironment", command.providerEnvironment)
        .eq("providerOrderId", orderEvent.providerOrderId),
    )
    .unique();
  if (
    existingOrder &&
    orderEvent.providerModifiedAt < existingOrder.providerModifiedAt
  ) {
    await ctx.db.patch(billingEventId, {
      outcome: "ignored",
      ignoredReason: "stale_provider_update",
    });
    return {
      outcome: "ignored" as const,
      eventType: command.eventType,
      resourceId: orderEvent.providerOrderId,
    };
  }
  await upsertCustomer(ctx, command);
  if (
    orderEvent.providerCheckoutId &&
    (orderEvent.state === "paid" ||
      orderEvent.state === "refunded" ||
      orderEvent.state === "partiallyRefunded")
  ) {
    const checkoutIntent = await ctx.db
      .query("billingCheckoutIntents")
      .withIndex("by_provider_checkout", (query) =>
        query
          .eq("providerEnvironment", command.providerEnvironment)
          .eq("providerCheckoutId", orderEvent.providerCheckoutId!),
      )
      .unique();
    if (checkoutIntent && checkoutIntent.status !== "completed") {
      await ctx.db.patch(checkoutIntent._id, {
        status: "completed",
        updatedAt: now,
      });
    }
  }
  const orderValue = {
    organizationId: command.event.organizationId,
    providerEnvironment: command.providerEnvironment,
    providerOrderId: command.event.providerOrderId,
    providerCheckoutId: command.event.providerCheckoutId,
    providerCustomerId: command.event.providerCustomerId,
    providerSubscriptionId: command.event.providerSubscriptionId,
    providerProductId: command.event.providerProductId,
    kind:
      catalog.kind === "aiCreditPack"
        ? ("prepaid" as const)
        : ("subscription" as const),
    state: command.event.state,
    subtotalAmountMinor: command.event.subtotalAmountMinor,
    discountAmountMinor: command.event.discountAmountMinor,
    taxAmountMinor: command.event.taxAmountMinor,
    grossAmountMinor: command.event.grossAmountMinor,
    netAmountMinor: command.event.netAmountMinor,
    refundedGrossAmountMinor: command.event.refundedGrossAmountMinor,
    currency: command.event.currency,
    billingReason: command.event.billingReason,
    providerModifiedAt: command.event.providerModifiedAt,
    updatedAt: now,
  };
  const orderId = existingOrder?._id;
  if (
    existingOrder &&
    command.event.providerModifiedAt >= existingOrder.providerModifiedAt
  ) {
    await ctx.db.patch(existingOrder._id, orderValue);
  }
  const persistedOrderId =
    orderId ??
    (await ctx.db.insert("billingOrders", {
      ...orderValue,
      createdAt: now,
    }));

  if (
    catalog.kind === "aiCreditPack" &&
    command.event.state === "paid" &&
    command.event.grossAmountMinor > 0n
  ) {
    const sourceRef = `prepaid:${command.event.providerOrderId}`;
    const lotId = await grantAiCredits(ctx, {
      organizationId: command.event.organizationId,
      bucket: "prepaid",
      sourceKind: "purchase",
      sourceRef,
      units: aiTopUpAmountToCreditUnits(command.event.grossAmountMinor),
      policyVersion: catalog.configurationVersion,
      billingEventId,
      now,
    });
    await reconcileAiCreditGrantUpward(ctx, {
      organizationId: command.event.organizationId,
      bucket: "prepaid",
      sourceRef,
      units: aiTopUpAmountToCreditUnits(command.event.grossAmountMinor),
      policyVersion: catalog.configurationVersion,
      billingEventId,
      now,
    });
    await ctx.db.patch(persistedOrderId, { creditLotId: lotId });
  }
  if (
    catalog.kind === "plus" &&
    command.event.state === "paid" &&
    command.event.providerSubscriptionId &&
    catalog.creditUnits !== undefined &&
    catalog.creditUnits > 0n
  ) {
    const subscription = await ctx.db
      .query("billingSubscriptions")
      .withIndex("by_provider_subscription", (query) =>
        query
          .eq("providerEnvironment", command.providerEnvironment)
          .eq("providerSubscriptionId", command.event.providerSubscriptionId!),
      )
      .unique();
    if (subscription?.normalizedStatus !== "entitled") {
      throw new Error(
        "Paid subscription order is waiting for authoritative subscription state",
      );
    }
    const sourceRef = `included:${command.event.providerSubscriptionId}:${subscription.currentPeriodStart}`;
    if (command.event.billingReason === "subscription_update") {
      await replaceUnusedIncludedCreditLots(ctx, {
        organizationId: command.event.organizationId,
        replacementRef: command.event.providerOrderId,
        preserveSourceRef: sourceRef,
        policyVersion: catalog.configurationVersion,
        billingEventId,
        now,
      });
    }
    const lotId = await grantAiCredits(ctx, {
      organizationId: command.event.organizationId,
      bucket: "included",
      sourceKind: "recurring",
      sourceRef,
      units: catalog.creditUnits,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      expiresAt: subscription.currentPeriodEnd,
      policyVersion: catalog.configurationVersion,
      billingEventId,
      now,
    });
    await ctx.db.patch(persistedOrderId, { creditLotId: lotId });
  }
  if (
    catalog.kind === "aiCreditPack" &&
    (command.event.state === "refunded" ||
      command.event.state === "partiallyRefunded") &&
    command.event.grossAmountMinor > 0n
  ) {
    await revokeAiCreditGrant(ctx, {
      organizationId: command.event.organizationId,
      sourceRef: `prepaid:${command.event.providerOrderId}`,
      targetRevokedUnits: moneyAmountMinorToCreditUnits(
        command.event.refundedGrossAmountMinor,
      ),
      policyVersion: catalog.configurationVersion,
      billingEventId,
      now,
    });
  }

  return {
    outcome: "applied" as const,
    eventType: command.eventType,
    resourceId: resourceId(command.event),
  };
}

/** The only durable entry point for verified Polar billing events. */
export const apply = internalMutation({
  args: commandValidator,
  handler: applyPolarBillingEvent,
});
