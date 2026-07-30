import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { verifyNangoWebhookSignature } from "./integrationWebhookSignature";

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

async function verifyNangoWebhook(
  rawBody: string,
  signature: string | null,
): Promise<boolean> {
  const signingKey = process.env.NANGO_WEBHOOK_SIGNING_KEY?.trim();
  return await verifyNangoWebhookSignature(rawBody, signature, signingKey);
}

export const handleNangoWebhook = httpAction(async (ctx, request) => {
  const rawBody = await request.text();
  const signature = request.headers.get("x-nango-hmac-sha256");
  if (!(await verifyNangoWebhook(rawBody, signature))) {
    return new Response("Invalid webhook signature", { status: 401 });
  }

  let payload: JsonObject;
  try {
    const parsed = asObject(JSON.parse(rawBody));
    if (!parsed) throw new Error("Expected an object");
    payload = parsed;
  } catch {
    return new Response("Invalid JSON payload", { status: 400 });
  }

  const type = asString(payload.type);
  const adapterConnectionId = asString(payload.connectionId);
  if (!adapterConnectionId) {
    return new Response(null, { status: 204 });
  }

  if (type === "auth") {
    const operation = asString(payload.operation) ?? "";
    const success = asBoolean(payload.success) ?? false;
    const error = asObject(payload.error);

    if (operation === "refresh" && !success) {
      await ctx.runMutation(
        internal.integrationModel.recordConnectionAuthFailure,
        {
          adapterConnectionId,
          errorCode: asString(error?.type),
          errorMessage: asString(error?.description),
        },
      );
      return new Response(null, { status: 204 });
    }

    const tags = asObject(payload.tags);
    const intentId = asString(tags?.baseblocks_connection_id);
    if (!intentId) {
      return new Response(null, { status: 204 });
    }
    await ctx.runMutation(
      internal.integrationModel.recordAuthorizationWebhook,
      {
        intentId,
        organizationId: asString(tags?.organization_id),
        adapterConnectionId,
        integrationId: asString(payload.providerConfigKey) ?? "",
        operation,
        success,
        errorCode: asString(error?.type),
        errorMessage: asString(error?.description),
      },
    );
    return new Response(null, { status: 204 });
  }

  if (type === "sync") {
    const error = asObject(payload.error);
    await ctx.runMutation(internal.integrationModel.queueNangoSync, {
      adapterConnectionId,
      integrationId: asString(payload.providerConfigKey) ?? "",
      syncName: asString(payload.syncName) ?? "",
      model: asString(payload.model) ?? "",
      success: asBoolean(payload.success) ?? false,
      errorMessage: asString(error?.description),
    });
  }

  return new Response(null, { status: 204 });
});
