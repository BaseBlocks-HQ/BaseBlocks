import { describe, expect, test } from "bun:test";
import {
  assertRunnerBudget,
  createProductionEditorAiRunner,
  resolveGatewayAccounting,
  sanitizeRunnerTelemetry,
} from "./runners";

describe("editor AI workspace runner", () => {
  test("uses the single configured production model", () => {
    const runner = createProductionEditorAiRunner({
      EDITOR_AI_MODEL: "openai/gpt-5.4-mini",
      AI_GATEWAY_API_KEY: "test-key",
    });
    expect(runner.modelId).toBe("openai/gpt-5.4-mini");
  });

  test("sanitizes telemetry without retaining tool arguments or results", () => {
    const telemetry = sanitizeRunnerTelemetry({
      finishReason: "stop",
      warnings: [{ message: "safe count only" }],
      totalUsage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      steps: [
        {
          providerMetadata: {
            gateway: {
              generationId: "gen_123",
              cost: "0.0123",
              secret: "no",
            },
          },
          response: { id: "aitxt-synthetic", headers: { secret: "no" } },
        },
      ],
      toolCalls: [
        { toolName: "readWorkspaceFile", input: { path: "secret.txt" } },
      ],
      toolResults: [{ output: "sensitive site content" }],
    });
    expect(telemetry).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      steps: 1,
      toolCalls: 1,
      generationIds: ["gen_123"],
      finishReason: "stop",
      warningCount: 1,
      toolNames: ["readWorkspaceFile"],
    });
    expect(JSON.stringify(telemetry)).not.toContain("secret.txt");
    expect(JSON.stringify(telemetry)).not.toContain("sensitive site content");
  });

  test("enforces every admitted run limit", () => {
    const telemetry = {
      inputTokens: 180,
      outputTokens: 30,
      totalTokens: 210,
      steps: 3,
      toolCalls: 3,
      gatewayCostUnits: 30_000n,
      retailChargeUnits: 37_500n,
    };
    expect(() =>
      assertRunnerBudget(telemetry, {
        maxRequests: 2,
        maxInputTokens: 1_000,
        maxOutputTokens: 1_000,
        maxChargeUnits: 1_000_000n,
      }),
    ).toThrow("request budget exceeded");
    expect(() =>
      assertRunnerBudget(telemetry, {
        maxRequests: 10,
        maxInputTokens: 1_000,
        maxOutputTokens: 1_000,
        maxChargeUnits: 20_000n,
      }),
    ).toThrow("spend budget exceeded");
  });

  test("retries generation accounting while Gateway metadata propagates", async () => {
    let attempts = 0;
    const accounting = await resolveGatewayAccounting(
      ["gen_eventual"],
      "openai/gpt-5.4-mini",
      "sandbox",
      {
        retryDelaysMs: [0, 0],
        sleep: async () => {},
        getGenerationInfo: async (id) => {
          attempts += 1;
          if (attempts < 3) throw new Error("Generation not found yet");
          return {
            id,
            totalCost: 0.004,
            upstreamInferenceCost: 0.004,
            usage: 0.004,
            createdAt: new Date(0).toISOString(),
            model: "openai/gpt-5.4-mini",
            isByok: false,
            providerName: "openai",
            streamed: false,
            finishReason: "stop",
            latency: 100,
            generationTime: 200,
            promptTokens: 100,
            completionTokens: 20,
            reasoningTokens: 0,
            cachedTokens: 0,
            cacheCreationTokens: 0,
            billableWebSearchCalls: 0,
          };
        },
      },
    );

    expect(attempts).toBe(3);
    expect(accounting.retailChargeUnits).toBe(5_000n);
  });
});
