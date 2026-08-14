import { createHmac } from "node:crypto";
import { afterEach, describe, expect, test } from "bun:test";
import { handlePolarWebhook } from "./billing_webhooks";

type RegisteredHttpAction = {
  _handler: (ctx: unknown, request: Request) => Promise<Response>;
};

const originalEnvironment = process.env.BASEBLOCKS_BILLING_ENVIRONMENT;
const originalSecret = process.env.POLAR_WEBHOOK_SECRET;

afterEach(() => {
  process.env.BASEBLOCKS_BILLING_ENVIRONMENT = originalEnvironment;
  process.env.POLAR_WEBHOOK_SECRET = originalSecret;
});

function signedRequest(secret: string, body: string, valid = true) {
  const deliveryId = "delivery-official-verifier-contract";
  const timestamp = Math.floor(Date.now() / 1_000);
  const signature = createHmac("sha256", valid ? secret : "wrong-secret")
    .update(`${deliveryId}.${timestamp}.${body}`)
    .digest("base64");
  return new Request("https://example.test/billing/webhooks/polar", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "webhook-id": deliveryId,
      "webhook-timestamp": String(timestamp),
      "webhook-signature": `v1,${signature}`,
    },
  });
}

function validOrderPaidBody() {
  const occurredAt = "2026-08-12T21:22:19.594Z";
  return JSON.stringify({
    type: "order.paid",
    timestamp: occurredAt,
    data: {
      id: "polar-order-1",
      created_at: occurredAt,
      modified_at: occurredAt,
      status: "paid",
      paid: true,
      subtotal_amount: 500,
      discount_amount: 0,
      net_amount: 417,
      tax_amount: 83,
      total_amount: 500,
      applied_balance_amount: 0,
      due_amount: 0,
      refunded_amount: 0,
      refunded_tax_amount: 0,
      currency: "usd",
      billing_reason: "purchase",
      billing_name: null,
      billing_address: null,
      invoice_number: "TEST-1",
      is_invoice_generated: true,
      receipt_number: "TEST-1",
      customer_id: "customer-1",
      product_id: "product-1",
      discount_id: null,
      subscription_id: null,
      checkout_id: "checkout-1",
      metadata: { baseblocks_workspace_id: "workspace-1" },
      platform_fee_amount: 0,
      platform_fee_currency: null,
      customer: {
        id: "customer-1",
        created_at: occurredAt,
        modified_at: occurredAt,
        metadata: {},
        external_id: "workspace-1",
        email_verified: true,
        type: "organization",
        name: "Test workspace",
        billing_name: null,
        billing_address: null,
        tax_id: null,
        organization_id: "polar-organization-1",
        deleted_at: null,
        avatar_url: null,
      },
      product: {
        metadata: {},
        id: "product-1",
        created_at: occurredAt,
        modified_at: occurredAt,
        trial_interval: null,
        trial_interval_count: null,
        name: "AI credits",
        description: null,
        visibility: "public",
        recurring_interval: null,
        recurring_interval_count: null,
        meter_interval: null,
        meter_interval_count: null,
        is_recurring: false,
        is_archived: false,
        organization_id: "polar-organization-1",
      },
      discount: null,
      subscription: null,
      items: [
        {
          created_at: occurredAt,
          modified_at: occurredAt,
          id: "item-1",
          label: "AI credits",
          amount: 417,
          tax_amount: 83,
          proration: false,
          product_price_id: "price-1",
        },
      ],
      description: "AI credits",
      refundable_amount: 417,
      refundable_tax_amount: 83,
    },
  });
}

describe("Polar webhook HTTP boundary", () => {
  test("verifies and applies a real SDK-shaped order with the complete secret", async () => {
    const secret = "whsec_literal-secret-contract";
    const mutations: unknown[] = [];
    process.env.BASEBLOCKS_BILLING_ENVIRONMENT = "production";
    process.env.POLAR_WEBHOOK_SECRET = secret;

    const response = await (
      handlePolarWebhook as unknown as RegisteredHttpAction
    )._handler(
      {
        runMutation: async (_reference: unknown, command: unknown) => {
          mutations.push(command);
          return { outcome: "applied" };
        },
      },
      signedRequest(secret, validOrderPaidBody()),
    );

    expect(response.status).toBe(202);
    expect(mutations).toEqual([
      expect.objectContaining({
        eventType: "order.paid",
        event: expect.objectContaining({
          organizationId: "workspace-1",
          providerOrderId: "polar-order-1",
          grossAmountMinor: 500n,
        }),
      }),
    ]);
  });

  test("rejects an invalid signature before processing the payload", async () => {
    const secret = "whsec_literal-secret-contract";
    process.env.BASEBLOCKS_BILLING_ENVIRONMENT = "production";
    process.env.POLAR_WEBHOOK_SECRET = secret;

    const response = await (
      handlePolarWebhook as unknown as RegisteredHttpAction
    )._handler({}, signedRequest(secret, validOrderPaidBody(), false));

    expect(response.status).toBe(403);
  });
});
