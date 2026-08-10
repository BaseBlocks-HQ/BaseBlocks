import { makeFunctionReference } from "convex/server";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import { verifyPolarWebhook } from "./billing/polar";

type JsonObject = Record<string, unknown>;
type ProviderEnvironment = "sandbox" | "production";

const ingestWebhook = makeFunctionReference<
  "mutation",
  {
    providerEnvironment: ProviderEnvironment;
    deliveryId: string;
    eventType: string;
    eventOccurredAt: number;
    providerModifiedAt?: number;
    resourceType?: string;
    resourceId?: string;
    organizationId?: string;
    providerCustomerId?: string;
    providerSubscriptionId?: string;
    providerOrderId?: string;
    payloadHash: string;
    rawPayload: string;
    payload: unknown;
  },
  { eventId: Id<"billingWebhookEvents">; duplicate: boolean }
>("billingModel:ingestWebhook");
const processWebhook = makeFunctionReference<
  "mutation",
  { eventId: Id<"billingWebhookEvents"> },
  null
>("billingModel:processWebhook");

function object(value: unknown): JsonObject | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;
}

function string(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function milliseconds(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function environment(): ProviderEnvironment | null {
  const value = process.env.BASEBLOCKS_BILLING_ENVIRONMENT;
  return value === "sandbox" || value === "production" ? value : null;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export const handlePolarWebhook = httpAction(async (ctx, request) => {
  const providerEnvironment = environment();
  if (!providerEnvironment) {
    return new Response("Billing webhook is not configured", { status: 503 });
  }
  const rawPayload = await request.text();
  if (rawPayload.length === 0 || rawPayload.length > 2_000_000) {
    return new Response("Invalid webhook payload", { status: 413 });
  }
  const verified = await verifyPolarWebhook(
    rawPayload,
    request.headers,
    process.env.POLAR_WEBHOOK_SECRET,
  );
  if (!verified)
    return new Response("Invalid webhook signature", { status: 401 });

  const eventType = string(verified.payload.type);
  const data = object(verified.payload.data);
  if (!eventType || !data)
    return new Response("Malformed webhook payload", { status: 400 });
  const metadata = object(data.metadata);
  const customer = object(data.customer);
  const subscription = object(data.subscription);
  const resourceType = eventType.split(".", 1)[0];
  const event = await ctx.runMutation(ingestWebhook, {
    providerEnvironment,
    deliveryId: verified.deliveryId,
    eventType,
    eventOccurredAt:
      milliseconds(verified.payload.timestamp) ?? verified.timestamp * 1_000,
    providerModifiedAt: milliseconds(data.modified_at),
    resourceType,
    resourceId: string(data.id),
    organizationId:
      string(metadata?.baseblocks_workspace_id) ??
      string(data.external_customer_id) ??
      string(customer?.external_id),
    providerCustomerId: string(data.customer_id) ?? string(customer?.id),
    providerSubscriptionId:
      string(data.subscription_id) ?? string(subscription?.id),
    providerOrderId: resourceType === "order" ? string(data.id) : undefined,
    payloadHash: await sha256Hex(rawPayload),
    rawPayload,
    payload: verified.payload,
  });
  if (!event.duplicate)
    await ctx.scheduler.runAfter(0, processWebhook, { eventId: event.eventId });
  return new Response(null, { status: 202 });
});
