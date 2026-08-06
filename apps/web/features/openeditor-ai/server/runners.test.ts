import { describe, expect, test } from "bun:test";
import {
  assertRunnerBudget,
  createProductionEditorAiRunner,
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
      gatewayCostUsd: 0.0123,
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
      gatewayCostUsd: 0.03,
    };
    expect(() =>
      assertRunnerBudget(telemetry, {
        maxRequests: 2,
        maxInputTokens: 1_000,
        maxOutputTokens: 1_000,
        maxSpendUsd: 1,
      }),
    ).toThrow("request budget exceeded");
    expect(() =>
      assertRunnerBudget(telemetry, {
        maxRequests: 10,
        maxInputTokens: 1_000,
        maxOutputTokens: 1_000,
        maxSpendUsd: 0.02,
      }),
    ).toThrow("spend budget exceeded");
  });
});
