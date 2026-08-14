import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks";
import { Buffer as BufferPolyfill } from "buffer";
import { makeFunctionReference } from "convex/server";
import { httpAction } from "./_generated/server";
import { polarEnvironmentFromEnvironment } from "./billing/polar";
import type { PolarBillingEventCommand } from "./billing_webhook_model";

// Polar's official Convex component installs this polyfill because Convex
// HTTP actions use the default runtime and Polar's verifier uses Buffer.
globalThis.Buffer = BufferPolyfill;

type ValidatedPolarEvent = ReturnType<typeof validateEvent>;

const applyBillingEvent = makeFunctionReference<
  "mutation",
  PolarBillingEventCommand,
  {
    outcome: "applied" | "duplicate" | "ignored";
    eventType: string;
    resourceId: string;
  }
>("billing_webhook_model:apply");

function requiredWorkspaceId(
  metadata: Record<string, unknown>,
  externalCustomerId: string | null | undefined,
) {
  const metadataId = metadata.baseblocks_workspace_id;
  const organizationId =
    typeof metadataId === "string" && metadataId.length > 0
      ? metadataId
      : externalCustomerId;
  if (!organizationId) {
    throw new Error("Polar billing event has no BaseBlocks workspace ID");
  }
  return organizationId;
}

function time(value: Date | null | undefined, fallback: number) {
  return value?.getTime() ?? fallback;
}

function integer(value: number, field: string) {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Polar ${field} is not a safe integer`);
  }
  return BigInt(value);
}

function errorSummary(error: unknown) {
  return error instanceof Error
    ? { name: error.name, message: error.message.slice(0, 500) }
    : { name: "UnknownError", message: "Non-Error value thrown" };
}

function polarWebhookToCommand(
  verified: ValidatedPolarEvent,
  deliveryId: string,
  providerEnvironment: "sandbox" | "production",
): PolarBillingEventCommand | null {
  const eventOccurredAt = verified.timestamp.getTime();
  switch (verified.type) {
    case "order.created":
    case "order.updated":
    case "order.paid":
    case "order.refunded": {
      const data = verified.data;
      if (!data.productId) {
        throw new Error("Polar order has no product ID");
      }
      const gross = integer(data.totalAmount, "order total");
      const refundedGross =
        integer(data.refundedAmount, "refunded amount") +
        integer(data.refundedTaxAmount, "refunded tax amount");
      const state =
        verified.type === "order.refunded"
          ? refundedGross >= gross
            ? ("refunded" as const)
            : ("partiallyRefunded" as const)
          : verified.type === "order.paid" || data.status === "paid"
            ? ("paid" as const)
            : data.status === "failed"
              ? ("failed" as const)
              : ("pending" as const);
      return {
        providerEnvironment,
        deliveryId,
        eventType: verified.type,
        eventOccurredAt,
        event: {
          kind: "order",
          organizationId: requiredWorkspaceId(
            data.metadata,
            data.customer.externalId,
          ),
          providerOrderId: data.id,
          providerCheckoutId: data.checkoutId ?? undefined,
          providerCustomerId: data.customerId,
          providerSubscriptionId: data.subscriptionId ?? undefined,
          providerProductId: data.productId,
          state,
          subtotalAmountMinor: integer(data.subtotalAmount, "subtotal"),
          discountAmountMinor: integer(data.discountAmount, "discount"),
          taxAmountMinor: integer(data.taxAmount, "tax"),
          grossAmountMinor: gross,
          netAmountMinor: integer(data.netAmount, "net amount"),
          refundedGrossAmountMinor: refundedGross,
          currency: data.currency,
          billingReason: data.billingReason,
          providerModifiedAt: time(data.modifiedAt, eventOccurredAt),
        },
      };
    }
    case "subscription.active":
    case "subscription.canceled":
    case "subscription.created":
    case "subscription.past_due":
    case "subscription.revoked":
    case "subscription.uncanceled":
    case "subscription.updated": {
      const data = verified.data;
      return {
        providerEnvironment,
        deliveryId,
        eventType: verified.type,
        eventOccurredAt,
        event: {
          kind: "subscription",
          organizationId: requiredWorkspaceId(
            data.metadata,
            data.customer.externalId,
          ),
          providerSubscriptionId: data.id,
          providerCustomerId: data.customerId,
          providerProductId: data.productId,
          providerStatus: data.status,
          seatQuantity: data.seats ?? 1,
          pendingSeatQuantity: data.pendingUpdate?.seats ?? undefined,
          pendingProductId: data.pendingUpdate?.productId ?? undefined,
          cancelAtPeriodEnd: data.cancelAtPeriodEnd,
          pauseAtPeriodEnd: data.pauseAtPeriodEnd,
          currentPeriodStart: data.currentPeriodStart.getTime(),
          currentPeriodEnd: data.currentPeriodEnd.getTime(),
          pastDueAt: data.pastDueAt?.getTime(),
          canceledAt: data.canceledAt?.getTime(),
          endedAt: data.endedAt?.getTime(),
          providerModifiedAt: time(data.modifiedAt, eventOccurredAt),
        },
      };
    }
    default:
      return null;
  }
}

export const handlePolarWebhook = httpAction(async (ctx, request) => {
  let providerEnvironment: "sandbox" | "production";
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
  try {
    providerEnvironment = polarEnvironmentFromEnvironment();
    if (!webhookSecret) throw new Error("Missing POLAR_WEBHOOK_SECRET");
  } catch {
    return new Response("Billing webhook is not configured", { status: 503 });
  }

  const rawBody = await request.text();
  if (rawBody.length === 0 || rawBody.length > 2_000_000) {
    return new Response("Invalid webhook payload", { status: 413 });
  }

  let verified: ValidatedPolarEvent;
  try {
    verified = validateEvent(
      rawBody,
      Object.fromEntries(request.headers.entries()),
      webhookSecret,
    );
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return new Response("Invalid webhook signature", { status: 403 });
    }
    // biome-ignore lint/suspicious/noConsole: Convex captures production function errors in its dashboard logs.
    console.error(
      "Polar webhook payload validation failed",
      errorSummary(error),
    );
    return new Response("Invalid Polar webhook payload", { status: 400 });
  }

  const deliveryId = request.headers.get("webhook-id");
  if (!deliveryId) {
    return new Response("Missing Polar delivery ID", { status: 400 });
  }

  try {
    const command = polarWebhookToCommand(
      verified,
      deliveryId,
      providerEnvironment,
    );
    if (command) await ctx.runMutation(applyBillingEvent, command);
    return new Response(null, { status: 202 });
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: Convex captures production function errors in its dashboard logs.
    console.error(
      "Polar billing event application failed",
      errorSummary(error),
    );
    return new Response("Polar billing event could not be applied", {
      status: 500,
    });
  }
});
