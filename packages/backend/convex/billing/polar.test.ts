import { describe, expect, test } from "bun:test";
import {
  billingOperationMetadata,
  createPolarBillingProvider,
  createPolarConfig,
  executePolarCheckout,
  normalizeSubscriptionLifecycle,
  PolarApiError,
  resolvePolarOrganizationCustomer,
  type PolarBillingProvider,
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
    expect(config.environment).toBe("sandbox");
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
      }).environment,
    ).toBe("production");
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
  const sdkCheckout = (overrides: Record<string, unknown> = {}) => ({
    id: "checkout_1",
    status: "open",
    url: "https://sandbox.polar.sh/checkout/checkout_1",
    expiresAt: new Date("2026-09-10T00:00:00Z"),
    customerId: "customer_1",
    subscriptionId: null,
    seats: 3,
    ...overrides,
  });

  function sdk(overrides: Record<string, unknown>) {
    return overrides as unknown as NonNullable<
      Parameters<typeof createPolarBillingProvider>[1]
    >;
  }

  test("creates a no-trial seat checkout through the official SDK", async () => {
    let request: Record<string, unknown> | undefined;
    const provider = createPolarBillingProvider(
      config,
      sdk({
        checkouts: {
          create: async (value: Record<string, unknown>) => {
            request = value;
            return sdkCheckout();
          },
        },
      }),
    );

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

    expect(request).toMatchObject({
      products: ["product_monthly"],
      customerId: "customer_1",
      seats: 3,
      allowTrial: false,
      metadata,
    });
  });

  test("creates each workspace as a team customer with an owner member", async () => {
    let request: Record<string, unknown> | undefined;
    const provider = createPolarBillingProvider(
      config,
      sdk({
        customers: {
          create: async (value: Record<string, unknown>) => {
            request = value;
            return {
              id: "customer_1",
              externalId: "organization_1",
              email: null,
              name: "Workspace",
              type: "team",
              modifiedAt: null,
            };
          },
        },
      }),
    );
    await provider.createCustomer({
      externalCustomerId: "organization_1",
      email: "owner@example.com",
      ownerExternalId: "user_1",
      name: "Workspace",
    });
    expect(request).toMatchObject({
      type: "team",
      externalId: "organization_1",
      name: "Workspace",
      owner: {
        email: "owner@example.com",
        name: "Workspace",
        externalId: "user_1",
      },
    });
    expect(request).not.toHaveProperty("email");
  });

  test("passes a validated customer-selected amount to custom pricing", async () => {
    let request: Record<string, unknown> | undefined;
    const provider = createPolarBillingProvider(
      config,
      sdk({
        checkouts: {
          create: async (value: Record<string, unknown>) => {
            request = value;
            return sdkCheckout({ id: "checkout_custom", seats: null });
          },
        },
      }),
    );

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

    expect(request).toMatchObject({
      products: ["product_ai_top_up"],
      amount: 1_700,
      allowDiscountCodes: false,
    });
  });

  test("maps subscription and portal operations to documented SDK calls", async () => {
    const calls: Array<{ method: string; request: unknown }> = [];
    const responseSubscription = {
      id: "sub_1",
      customerId: "customer_1",
      productId: "product_1",
      status: "active",
      seats: 4,
      amount: 3200,
      currency: "usd",
      recurringInterval: "month",
      recurringIntervalCount: 1,
      currentPeriodStart: new Date("2026-08-01T00:00:00Z"),
      currentPeriodEnd: new Date("2026-09-01T00:00:00Z"),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      endedAt: null,
      pastDueAt: null,
      pauseAtPeriodEnd: false,
      pausedAt: null,
      resumesAt: null,
      modifiedAt: new Date("2026-08-01T00:00:00Z"),
      metadata: {},
      pendingUpdate: null,
    };
    const provider = createPolarBillingProvider(
      config,
      sdk({
        subscriptions: {
          update: async (request: unknown) => {
            calls.push({ method: "update", request });
            return responseSubscription;
          },
          revoke: async (request: unknown) => {
            calls.push({ method: "revoke", request });
            return responseSubscription;
          },
          get: async (request: unknown) => {
            calls.push({ method: "get", request });
            return responseSubscription;
          },
        },
        customerSessions: {
          create: async (request: unknown) => {
            calls.push({ method: "portal", request });
            return {
              id: "session_1",
              customerId: "customer_1",
              customerPortalUrl: "https://sandbox.polar.sh/purchases/session_1",
              expiresAt: new Date("2026-08-09T13:00:00Z"),
            };
          },
        },
      }),
    );

    await provider.updateSubscriptionSeats("sub_1", 4, "prorate");
    await provider.setCancelAtPeriodEnd("sub_1", true);
    await provider.revokeSubscription("sub_1");
    await provider.getSubscription("sub_1");
    const portal = await provider.createCustomerPortalSession({
      customerId: "customer_1",
      externalMemberId: "workspace_1",
      returnUrl: "https://app.example.com/settings/billing",
    });

    expect(calls[0]).toEqual({
      method: "update",
      request: {
        id: "sub_1",
        subscriptionUpdate: { seats: 4, prorationBehavior: "prorate" },
      },
    });
    expect(calls[1]).toEqual({
      method: "update",
      request: {
        id: "sub_1",
        subscriptionUpdate: { cancelAtPeriodEnd: true },
      },
    });
    expect(calls[2]).toEqual({ method: "revoke", request: { id: "sub_1" } });
    expect(calls[3]).toEqual({ method: "get", request: { id: "sub_1" } });
    expect(calls[4]).toEqual({
      method: "portal",
      request: {
        customerId: "customer_1",
        externalMemberId: "workspace_1",
        returnUrl: "https://app.example.com/settings/billing",
      },
    });
    expect(portal.customerPortalUrl).toContain("sandbox.polar.sh");
  });

  test("rejects invalid seats and unsafe redirect URLs before the SDK", async () => {
    let called = false;
    const provider = createPolarBillingProvider(
      config,
      sdk({
        checkouts: {
          create: async () => {
            called = true;
            throw new Error("unexpected SDK call");
          },
        },
      }),
    );
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

  test("sanitizes SDK HTTP failures", async () => {
    const provider = createPolarBillingProvider(
      config,
      sdk({
        checkouts: {
          get: async () => {
            throw { statusCode: 401, body: "secret provider response" };
          },
        },
      }),
    );
    await expect(provider.getCheckout("checkout_1")).rejects.toEqual(
      expect.objectContaining({ name: "PolarApiError", status: 401 }),
    );
    await expect(provider.getCheckout("checkout_1")).rejects.not.toThrow(
      "secret provider response",
    );
  });

  test("uses the organization as the immutable external customer identity", async () => {
    let createdExternalId: string | undefined;
    const provider = {
      getCustomerByExternalId: async () => {
        throw new PolarApiError(404);
      },
      createCustomer: async (input: { externalCustomerId: string }) => {
        createdExternalId = input.externalCustomerId;
        return {
          id: "customer_1",
          externalId: input.externalCustomerId,
          email: "owner@example.com",
          name: "Owner",
          type: "individual" as const,
          modifiedAt: null,
        };
      },
    } as unknown as PolarBillingProvider;

    const customer = await resolvePolarOrganizationCustomer(provider, {
      externalCustomerId: "organization_1",
      email: "owner@example.com",
    });
    expect(createdExternalId).toBe("organization_1");
    expect(customer.externalId).toBe("organization_1");
  });

  test("replays a persisted checkout without creating another", async () => {
    let createCalls = 0;
    const provider = {
      getCheckout: async () => ({
        id: "checkout_1",
        status: "open",
        url: "https://sandbox.polar.sh/checkout/checkout_1",
        expiresAt: "2026-09-10T00:00:00Z",
        customerId: "customer_1",
        subscriptionId: null,
        seats: 1,
      }),
      createCheckout: async () => {
        createCalls += 1;
        throw new Error("should not create");
      },
    } as unknown as PolarBillingProvider;
    const result = await executePolarCheckout(provider, {
      providerCheckoutId: "checkout_1",
      checkout: {
        productIds: ["product_1"],
        customerId: "customer_1",
        successUrl: "https://app.example.com/success",
        returnUrl: "https://app.example.com/billing",
        metadata: {},
      },
    });
    expect(result.replay).toBe(true);
    expect(createCalls).toBe(0);
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
