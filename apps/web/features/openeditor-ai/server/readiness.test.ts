import { describe, expect, test } from "bun:test";
import { getEditorAiReadiness } from "./readiness";

describe("editor AI credential readiness", () => {
  test("reports missing configuration without exposing credential values", () => {
    const result = getEditorAiReadiness({});
    expect(result.ready).toBe(false);
    expect(result.missing).toEqual([
      "EDITOR_AI_MODEL",
      "AI_GATEWAY_API_KEY or Vercel OIDC",
    ]);
    expect(JSON.stringify(result)).not.toContain("apiKey");
  });

  test("accepts Gateway authentication for the production workspace runner", () => {
    const result = getEditorAiReadiness({
      EDITOR_AI_MODEL: "provider/model",
      AI_GATEWAY_API_KEY: "secret-value",
    });
    expect(result).toEqual({
      ready: true,
      missing: [],
      authentication: "ai-gateway-key",
    });
    expect(JSON.stringify(result)).not.toContain("secret-value");
  });

  test("prefers deployment OIDC", () => {
    expect(
      getEditorAiReadiness({
        EDITOR_AI_MODEL: "provider/model",
        VERCEL_OIDC_TOKEN: "oidc-secret",
        AI_GATEWAY_API_KEY: "gateway-secret",
      }),
    ).toEqual({
      ready: true,
      missing: [],
      authentication: "vercel-oidc",
    });
  });
});
