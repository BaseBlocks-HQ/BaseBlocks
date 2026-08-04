import { describe, expect, test } from "bun:test";
import {
  assertRunnerBudget,
  createProductionEditorAiRunner,
  mergeRunnerTelemetry,
  repairInvalidWorkspace,
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

  test("repairs an invalid workspace and revalidates the result", async () => {
    let validationCalls = 0;
    const diagnostics = [
      { code: "invalid_document", message: "Missing a stable node ID" },
    ];
    const repairs: (typeof diagnostics)[] = [];
    const result = await repairInvalidWorkspace({
      result: "initial",
      abortSignal: new AbortController().signal,
      validate: async () => {
        validationCalls += 1;
        return validationCalls === 1
          ? { valid: false, diagnostics }
          : { valid: true, diagnostics: [] };
      },
      repair: async (issues) => {
        repairs.push([...issues]);
        return "repaired";
      },
    });

    expect(result).toBe("repaired");
    expect(validationCalls).toBe(2);
    expect(repairs).toEqual([diagnostics]);
  });

  test("aggregates repair usage and enforces every admitted run limit", () => {
    const telemetry = mergeRunnerTelemetry(
      {
        inputTokens: 100,
        outputTokens: 20,
        totalTokens: 120,
        steps: 2,
        toolCalls: 1,
        gatewayCostUsd: 0.01,
      },
      {
        inputTokens: 80,
        outputTokens: 10,
        totalTokens: 90,
        steps: 1,
        toolCalls: 2,
        gatewayCostUsd: 0.02,
      },
    );
    expect(telemetry).toMatchObject({
      inputTokens: 180,
      outputTokens: 30,
      totalTokens: 210,
      steps: 3,
      toolCalls: 3,
      gatewayCostUsd: 0.03,
    });
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
