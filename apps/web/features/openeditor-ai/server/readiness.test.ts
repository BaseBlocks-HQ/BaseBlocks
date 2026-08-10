import { describe, expect, test } from "bun:test";
import { getEditorAiReadiness } from "./readiness";

describe("editor AI credential readiness", () => {
  test("reports missing configuration without exposing credential values", () => {
    const result = getEditorAiReadiness({});
    expect(result.ready).toBe(false);
    expect(result.missing).toEqual([
      "BASEBLOCKS_AI_FUNDING_MODE=hosted-funded",
      "EDITOR_AI_MODEL",
      "BASEBLOCKS_BILLING_ENVIRONMENT",
      "AI_GATEWAY_API_KEY or Vercel OIDC",
    ]);
    expect(JSON.stringify(result)).not.toContain("apiKey");
  });

  test("accepts Gateway authentication for the production workspace runner", () => {
    const result = getEditorAiReadiness({
      EDITOR_AI_MODEL: "provider/model",
      AI_GATEWAY_API_KEY: "secret-value",
      BASEBLOCKS_AI_FUNDING_MODE: "hosted-funded",
      BASEBLOCKS_BILLING_ENVIRONMENT: "sandbox",
    });
    expect(result).toEqual({
      ready: true,
      missing: [],
      authentication: "ai-gateway-key",
      fundingMode: "hosted-funded",
    });
    expect(JSON.stringify(result)).not.toContain("secret-value");
  });

  test("accepts the Vercel Function request-context OIDC token", () => {
    expect(
      getEditorAiReadiness(
        {
          BASEBLOCKS_AI_FUNDING_MODE: "hosted-funded",
          BASEBLOCKS_BILLING_ENVIRONMENT: "sandbox",
          EDITOR_AI_MODEL: "openai/gpt-5.4-mini",
        },
        "request-oidc-token",
      ),
    ).toMatchObject({ ready: true, authentication: "vercel-oidc" });
  });

  test("matches Gateway API-key precedence when both credentials exist", () => {
    expect(
      getEditorAiReadiness({
        EDITOR_AI_MODEL: "provider/model",
        VERCEL_OIDC_TOKEN: "oidc-secret",
        AI_GATEWAY_API_KEY: "gateway-secret",
        BASEBLOCKS_AI_FUNDING_MODE: "hosted-funded",
        BASEBLOCKS_BILLING_ENVIRONMENT: "sandbox",
      }),
    ).toEqual({
      ready: true,
      missing: [],
      authentication: "ai-gateway-key",
      fundingMode: "hosted-funded",
    });
  });
});
