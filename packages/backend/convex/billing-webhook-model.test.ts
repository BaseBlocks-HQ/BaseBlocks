import { describe, expect, test } from "bun:test";
import { convexTest } from "convex-test";
import type { QueryCtx } from "./_generated/server";
import {
  applyPolarBillingEvent,
  type PolarBillingEventCommand,
} from "./billing_webhook_model";
import schema from "./schema";

const organizationId = "organization-alpha";
const modules = { "./_generated/api.ts": async () => ({}) };
const paidAt = Date.parse("2026-08-12T21:22:19.594Z");

function paidCreditOrder(
  overrides: Partial<PolarBillingEventCommand> = {},
): PolarBillingEventCommand {
  return {
    providerEnvironment: "production",
    deliveryId: "delivery-order-paid-1",
    eventType: "order.paid",
    eventOccurredAt: paidAt,
    event: {
      kind: "order",
      organizationId,
      providerOrderId: "polar-order-1",
      providerCheckoutId: "polar-checkout-1",
      providerCustomerId: "polar-customer-1",
      providerProductId: "polar-credit-product",
      state: "paid",
      subtotalAmountMinor: 500n,
      discountAmountMinor: 0n,
      taxAmountMinor: 83n,
      grossAmountMinor: 500n,
      netAmountMinor: 417n,
      refundedGrossAmountMinor: 0n,
      currency: "usd",
      billingReason: "purchase",
      providerModifiedAt: paidAt,
    },
    ...overrides,
  };
}

async function seedWorkspace(
  t: ReturnType<typeof convexTest>,
  kind: "credits" | "plus" = "credits",
) {
  await t.mutation(async (ctx) => {
    const now = Date.now();
    await ctx.db.insert("workspaceProfiles", {
      organizationId,
      intent: kind === "plus" ? "work" : "personal",
      source: "onboarding",
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("billingCatalogItems", {
      providerEnvironment: "production",
      sku: kind === "plus" ? "plus_monthly" : "ai_credit_top_up",
      kind: kind === "plus" ? "plus" : "aiCreditPack",
      providerProductId:
        kind === "plus" ? "polar-plus-product" : "polar-credit-product",
      providerPriceId: kind === "plus" ? "polar-plus-price" : undefined,
      planKey: kind === "plus" ? "plus" : undefined,
      recurringInterval: kind === "plus" ? "month" : undefined,
      priceAmountMinor: kind === "plus" ? 1_000n : 500n,
      currency: "usd",
      creditUnits: kind === "plus" ? 2_000_000n : undefined,
      configurationVersion:
        kind === "plus" ? "polar-plus-v1" : "polar-credit-v1",
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  });
}

async function readState(ctx: QueryCtx) {
  const [account, orders, entitlement] = await Promise.all([
    ctx.db
      .query("aiCreditAccounts")
      .withIndex("by_organization", (query) =>
        query.eq("organizationId", organizationId),
      )
      .unique(),
    ctx.db
      .query("billingOrders")
      .withIndex("by_organization_created", (query) =>
        query.eq("organizationId", organizationId),
      )
      .collect(),
    ctx.db
      .query("workspaceEntitlements")
      .withIndex("by_organization", (query) =>
        query.eq("organizationId", organizationId),
      )
      .unique(),
  ]);
  return { account, orders, entitlement };
}

describe("Polar billing event interface", () => {
  test("grants a paid order exactly once across both forms of redelivery", async () => {
    const t = convexTest(schema, modules);
    await seedWorkspace(t);

    const applied = await t.mutation(async (ctx) =>
      applyPolarBillingEvent(ctx, paidCreditOrder()),
    );
    const repeatedDelivery = await t.mutation(async (ctx) =>
      applyPolarBillingEvent(ctx, paidCreditOrder()),
    );
    await t.mutation(async (ctx) =>
      applyPolarBillingEvent(
        ctx,
        paidCreditOrder({ deliveryId: "delivery-provider-redelivery" }),
      ),
    );
    const state = await t.query(readState);

    expect(applied.outcome).toBe("applied");
    expect(repeatedDelivery.outcome).toBe("duplicate");
    expect(state.account?.availablePrepaidUnits).toBe(5_000_000n);
    expect(state.orders).toHaveLength(1);
  });

  test("refunds monotonically and rejects an older paid state", async () => {
    const t = convexTest(schema, modules);
    await seedWorkspace(t);
    await t.mutation(async (ctx) =>
      applyPolarBillingEvent(ctx, paidCreditOrder()),
    );
    const refundedAt = Date.parse("2026-08-14T00:00:00Z");
    const order = paidCreditOrder().event;
    if (order.kind !== "order") throw new Error("Expected an order fixture");
    await t.mutation(async (ctx) =>
      applyPolarBillingEvent(
        ctx,
        paidCreditOrder({
          deliveryId: "delivery-order-refunded",
          eventType: "order.refunded",
          eventOccurredAt: refundedAt,
          event: {
            ...order,
            state: "refunded",
            refundedGrossAmountMinor: 500n,
            providerModifiedAt: refundedAt,
          },
        }),
      ),
    );
    const stale = await t.mutation(async (ctx) =>
      applyPolarBillingEvent(
        ctx,
        paidCreditOrder({ deliveryId: "delivery-stale-paid" }),
      ),
    );
    const state = await t.query(readState);

    expect(stale.outcome).toBe("ignored");
    expect(state.account?.availablePrepaidUnits).toBe(0n);
    expect(state.orders).toHaveLength(1);
  });

  test("reconciles a newer authoritative order amount upward", async () => {
    const t = convexTest(schema, modules);
    await seedWorkspace(t);
    await t.mutation(async (ctx) =>
      applyPolarBillingEvent(ctx, paidCreditOrder()),
    );
    const order = paidCreditOrder().event;
    if (order.kind !== "order") throw new Error("Expected an order fixture");
    const updatedAt = Date.parse("2026-08-13T00:00:00Z");
    await t.mutation(async (ctx) =>
      applyPolarBillingEvent(
        ctx,
        paidCreditOrder({
          deliveryId: "delivery-order-updated-amount",
          eventType: "order.updated",
          eventOccurredAt: updatedAt,
          event: {
            ...order,
            grossAmountMinor: 700n,
            providerModifiedAt: updatedAt,
          },
        }),
      ),
    );

    const state = await t.query(readState);
    expect(state.account?.availablePrepaidUnits).toBe(7_000_000n);
    expect(state.orders).toHaveLength(1);
  });

  test("atomically enables an active subscription entitlement", async () => {
    const t = convexTest(schema, modules);
    await seedWorkspace(t, "plus");

    const result = await t.mutation(async (ctx) =>
      applyPolarBillingEvent(ctx, {
        providerEnvironment: "production",
        deliveryId: "delivery-subscription-active-1",
        eventType: "subscription.active",
        eventOccurredAt: paidAt,
        event: {
          kind: "subscription",
          organizationId,
          providerSubscriptionId: "polar-subscription-1",
          providerCustomerId: "polar-customer-1",
          providerProductId: "polar-plus-product",
          providerStatus: "active",
          seatQuantity: 2,
          cancelAtPeriodEnd: false,
          currentPeriodStart: Date.parse("2026-08-01T00:00:00.000Z"),
          currentPeriodEnd: Date.parse("2026-09-01T00:00:00.000Z"),
          providerModifiedAt: paidAt,
        },
      }),
    );
    const state = await t.query(readState);

    expect(result.outcome).toBe("applied");
    expect(state.entitlement?.plusEnabled).toBe(true);
    expect(state.entitlement).not.toHaveProperty("paidSeatCapacity");
    expect(state.entitlement).not.toHaveProperty("billableSeatCount");
  });
});
