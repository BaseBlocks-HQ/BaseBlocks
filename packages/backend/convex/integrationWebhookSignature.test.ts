import { createHmac } from "node:crypto";
import { describe, expect, test } from "bun:test";
import { verifyNangoWebhookSignature } from "./integrationWebhookSignature";

describe("verifyNangoWebhookSignature", () => {
  const body = '{"type":"auth","connectionId":"connection-1"}';
  const signingKey = "webhook-signing-key";
  const signature = createHmac("sha256", signingKey).update(body).digest("hex");

  test("accepts the HMAC of the unmodified raw body", async () => {
    expect(await verifyNangoWebhookSignature(body, signature, signingKey)).toBe(
      true,
    );
  });

  test("rejects tampered bodies and missing configuration", async () => {
    expect(
      await verifyNangoWebhookSignature(`${body} `, signature, signingKey),
    ).toBe(false);
    expect(await verifyNangoWebhookSignature(body, signature, undefined)).toBe(
      false,
    );
  });
});
