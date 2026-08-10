import { createHmac } from "node:crypto";
import { describe, expect, test } from "bun:test";
import {
  billingOperationMetadata,
  createPolarBillingProvider,
  createPolarConfig,
  normalizeSubscriptionLifecycle,
  verifyPolarWebhook,
  type PolarSubscription,
} from "./polar";

const config = createPolarConfig({
  environment: "sandbox",
  accessToken: "sandbox-access-token",
  webhookSecret: "sandbox-webhook-secret",
});

function subscription(
  overrides: Partial<PolarSubscription> = {},
): PolarSubscription {
  return {
    id: "sub_1",
    customerId: "customer_1",
    productId: "product_1",
    status: "active",
    seats: 1,
    amount: 800,
    currency: "usd",
    recurringInterval: "month",
    recurringIntervalCount: 1,
    currentPeriodStart: "2026-08-01T00:00:00Z",
    currentPeriodEnd: "2026-09-01T00:00:00Z",
    cancelAtPeriodEnd: false,
    canceledAt: null,
    endedAt: null,
    pastDueAt: null,
    pauseAtPeriodEnd: false,
    pausedAt: null,
    resumesAt: null,
    modifiedAt: "2026-08-01T00:00:00Z",
    metadata: {},
    pendingUpdate: null,
    ...overrides,
  };
}

describe("Polar configuration", () => {
  test("is sandbox-first and requires an explicit production gate", () => {
    expect(config.apiBaseUrl).toBe("https://sandbox-api.polar.sh/v1");
    expect(() =>
      createPolarConfig({
        environment: "production",
        accessToken: "production-access-token",
        webhookSecret: "production-webhook-secret",
      }),
    ).toThrow("not explicitly enabled");
    expect(
      createPolarConfig({
        environment: "production",
        accessToken: "production-access-token",
        webhookSecret: "production-webhook-secret",
        allowProduction: true,
      }).apiBaseUrl,
    ).toBe("https://api.polar.sh/v1");
  });

  test("rejects missing secrets and ambiguous environments", () => {
    expect(() =>
      createPolarConfig({
        environment: undefined,
        accessToken: "sandbox-access-token",
        webhookSecret: "sandbox-webhook-secret",
      }),
    ).toThrow("explicitly set");
    expect(() =>
      createPolarConfig({
        environment: "sandbox",
        accessToken: "",
        webhookSecret: "sandbox-webhook-secret",
      }),
    ).toThrow("POLAR_ACCESS_TOKEN");
  });
});

describe("Polar request boundary", () => {
  test("reuses a customer found by unique billing email", async () => {
    const provider = createPolarBillingProvider(config, async (url) => {
      expect(String(url)).toContain("/customers/?email=owner%40example.com");
      return Response.json({
        items: [
          {
            id: "customer_1",
            external_id: "payer_1",
            email: "owner@example.com",
            name: "Owner",
            type: "individual",
            modified_at: "2026-08-10T00:00:00Z",
          },
        ],
      });
    });

    await expect(
      provider.getCustomerByEmail("owner@example.com"),
    ).resolves.toEqual(
      expect.objectContaining({ id: "customer_1", externalId: "payer_1" }),
    );
  });

  test("includes Polar validation details without exposing the response body", async () => {
    const provider = createPolarBillingProvider(config, async () =>
      Response.json(
        { detail: [{ msg: "Email address is already used" }] },
        { status: 422 },
      ),
    );

    await expect(
      provider.getCustomerByEmail("owner@example.com"),
    ).rejects.toThrow("422: Email address is already used");
  });

  test("creates a no-trial seat checkout with reconciliation metadata", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const provider = createPolarBillingProvider(config, async (url, init) => {
      calls.push({ url: String(url), init });
      return Response.json({
        id: "checkout_1",
        status: "open",
        url: "https://sandbox.polar.sh/checkout/checkout_1",
        expires_at: "2026-08-10T00:00:00Z",
        customer_id: null,
        subscription_id: null,
        seats: 3,
      });
    });

    const metadata = billingOperationMetadata({
      workspaceId: "workspace_1",
      operationKey: "checkout:workspace_1:monthly:3",
      purpose: "plus_subscription",
    });
    await provider.createCheckout({
      productIds: ["product_monthly"],
      customerId: "customer_1",
      successUrl: "https://app.example.com/billing/success",
      returnUrl: "https://app.example.com/settings/billing",
      seats: 3,
      metadata,
    });

    expect(calls[0]?.url).toBe("https://sandbox-api.polar.sh/v1/checkouts/");
    const body = JSON.parse(String(calls[0]?.init?.body));
    expect(body).toMatchObject({
      products: ["product_monthly"],
      customer_id: "customer_1",
      seats: 3,
      allow_trial: false,
      metadata,
    });
    expect(
      String(new Headers(calls[0]?.init?.headers).get("authorization")),
    ).toBe("Bearer sandbox-access-token");
  });

  test("passes a validated customer-selected amount to custom pricing", async () => {
    let body: Record<string, unknown> | undefined;
    const provider = createPolarBillingProvider(config, async (_url, init) => {
      body = JSON.parse(String(init?.body));
      return Response.json({
        id: "checkout_custom",
        status: "open",
        url: "https://sandbox.polar.sh/checkout/checkout_custom",
        expires_at: "2026-08-10T00:00:00Z",
        customer_id: "customer_1",
        subscription_id: null,
        seats: null,
      });
    });

    await provider.createCheckout({
      productIds: ["product_ai_top_up"],
      customerId: "customer_1",
      successUrl: "https://app.example.com/billing/success",
      returnUrl: "https://app.example.com/settings/billing",
      amountMinor: 1_700,
      allowDiscountCodes: false,
      metadata: billingOperationMetadata({
        workspaceId: "workspace_1",
        operationKey: "checkout:workspace_1:ai:1700",
        purpose: "ai_credit_pack",
      }),
    });

    expect(body).toMatchObject({
      products: ["product_ai_top_up"],
      amount: 1_700,
      allow_discount_codes: false,
    });
  });

  test("maps seat, cancellation, portal, and reconciliation API boundaries", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const responseSubscription = {
      id: "sub_1",
      customer_id: "customer_1",
      product_id: "product_1",
      status: "active",
      seats: 4,
      amount: 3200,
      currency: "usd",
      recurring_interval: "month",
      recurring_interval_count: 1,
      current_period_start: "2026-08-01T00:00:00Z",
      current_period_end: "2026-09-01T00:00:00Z",
      cancel_at_period_end: false,
      pause_at_period_end: false,
      metadata: {},
      pending_update: null,
    };
    const provider = createPolarBillingProvider(config, async (url, init) => {
      calls.push({ url: String(url), init });
      if (String(url).endsWith("/customer-sessions/")) {
        return Response.json({
          id: "session_1",
          customer_id: "customer_1",
          customer_portal_url: "https://sandbox.polar.sh/purchases/session_1",
          expires_at: "2026-08-09T13:00:00Z",
        });
      }
      return Response.json(responseSubscription);
    });

    await provider.updateSubscriptionSeats("sub_1", 4, "prorate");
    await provider.setCancelAtPeriodEnd("sub_1", true);
    await provider.revokeSubscription("sub_1");
    await provider.getSubscription("sub_1");
    const portal = await provider.createCustomerPortalSession(
      "customer_1",
      "https://app.example.com/settings/billing",
      "workspace_1",
    );

    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      seats: 4,
      proration_behavior: "prorate",
    });
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      cancel_at_period_end: true,
    });
    expect(JSON.parse(String(calls[2]?.init?.body))).toEqual({ revoke: true });
    expect(calls[3]?.init?.method).toBeUndefined();
    expect(JSON.parse(String(calls[4]?.init?.body))).toEqual({
      customer_id: "customer_1",
      external_member_id: "workspace_1",
      return_url: "https://app.example.com/settings/billing",
    });
    expect(portal.customerPortalUrl).toContain("sandbox.polar.sh");
  });

  test("rejects invalid seats and unsafe redirect URLs before fetch", async () => {
    let called = false;
    const provider = createPolarBillingProvider(config, async () => {
      called = true;
      throw new Error("unexpected fetch");
    });
    await expect(
      provider.createCheckout({
        productIds: ["product_monthly"],
        customerId: "customer_1",
        successUrl: "http://app.example.com/billing/success",
        returnUrl: "https://app.example.com/settings/billing",
        seats: 0,
        metadata: {},
      }),
    ).rejects.toThrow("HTTPS");
    expect(called).toBe(false);
  });
});

describe("subscription normalization", () => {
  test("normalizes lifecycle states conservatively", () => {
    expect(normalizeSubscriptionLifecycle(subscription()).state).toBe(
      "entitled",
    );
    expect(
      normalizeSubscriptionLifecycle(subscription({ status: "past_due" }))
        .state,
    ).toBe("grace");
    expect(
      normalizeSubscriptionLifecycle(subscription({ status: "trialing" }))
        .state,
    ).toBe("pending");
    expect(
      normalizeSubscriptionLifecycle(subscription({ status: "paused" })).state,
    ).toBe("suspended");
    expect(
      normalizeSubscriptionLifecycle(subscription({ status: "new_status" }))
        .state,
    ).toBe("unknown");
  });

  test("retains access boundary for scheduled cancellation", () => {
    expect(
      normalizeSubscriptionLifecycle(subscription({ cancelAtPeriodEnd: true })),
    ).toEqual({
      state: "entitled",
      scheduledCancellation: true,
      scheduledPause: false,
      effectiveThrough: "2026-09-01T00:00:00Z",
    });
  });
});

describe("Polar Standard Webhooks verification", () => {
  const secret = "polar-webhook-secret";
  const body = JSON.stringify({
    type: "subscription.updated",
    timestamp: "2026-08-09T12:00:00Z",
    data: { id: "sub_1" },
  });
  const timestamp = 1_786_276_800;
  const deliveryId = "evt_delivery_1";
  const signature = createHmac("sha256", secret)
    .update(`${deliveryId}.${timestamp}.${body}`)
    .digest("base64");
  const headers = {
    "webhook-id": deliveryId,
    "webhook-timestamp": String(timestamp),
    "webhook-signature": `v1,${signature}`,
  };

  test("accepts the unmodified raw body and returns replay identity", async () => {
    const verified = await verifyPolarWebhook(body, headers, secret, {
      now: timestamp,
    });
    expect(verified?.deliveryId).toBe(deliveryId);
    expect(verified?.payload.type).toBe("subscription.updated");
  });

  test("rejects tampering, stale delivery, and missing headers", async () => {
    expect(
      await verifyPolarWebhook(`${body} `, headers, secret, { now: timestamp }),
    ).toBeNull();
    expect(
      await verifyPolarWebhook(body, headers, secret, {
        now: timestamp + 301,
      }),
    ).toBeNull();
    expect(
      await verifyPolarWebhook(body, {}, secret, { now: timestamp }),
    ).toBeNull();
  });
});
