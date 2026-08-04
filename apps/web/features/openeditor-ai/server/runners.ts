import {
  importProjectWorkspace,
  InMemoryWorkspaceFileStore,
} from "@openeditor/workspace";
import {
  assertBaseBlocksDocument,
  baseBlocksDocumentContract,
} from "@baseblocks/openeditor-contracts";
import { gateway } from "ai";
import {
  createEditorWorkspaceAgent,
  type WorkspaceValidationSummary,
} from "./ai-sdk-adapter";
import { EditorAiConfigurationError } from "./orchestrator";
import { getEditorAiReadiness } from "./readiness";
import type {
  EditorAiRunner,
  EditorAiRunnerInput,
  EditorAiRunnerOutput,
  EditorAiRunBudget,
} from "./types";

export function sanitizeRunnerTelemetry(
  result: unknown,
): EditorAiRunnerOutput["telemetry"] {
  if (!result || typeof result !== "object") return undefined;
  const value = result as Record<string, unknown>;
  const usage = (
    value.totalUsage && typeof value.totalUsage === "object"
      ? value.totalUsage
      : value.usage && typeof value.usage === "object"
        ? value.usage
        : {}
  ) as Record<string, unknown>;
  const steps = Array.isArray(value.steps) ? value.steps : [];
  const generationIds = steps.flatMap((step) => {
    if (!step || typeof step !== "object") return [];
    const record = step as {
      providerMetadata?: unknown;
      response?: unknown;
    };
    const metadata =
      record.providerMetadata && typeof record.providerMetadata === "object"
        ? (record.providerMetadata as Record<string, unknown>)
        : undefined;
    const gatewayMetadata =
      metadata?.gateway && typeof metadata.gateway === "object"
        ? (metadata.gateway as Record<string, unknown>)
        : undefined;
    if (typeof gatewayMetadata?.generationId === "string") {
      return [gatewayMetadata.generationId];
    }
    const responseId =
      record.response && typeof record.response === "object"
        ? (record.response as { id?: unknown }).id
        : undefined;
    return typeof responseId === "string" && responseId.startsWith("gen_")
      ? [responseId]
      : [];
  });
  const toolCalls = Array.isArray(value.toolCalls) ? value.toolCalls : [];
  const gatewayCosts = steps.flatMap((step) => {
    if (!step || typeof step !== "object") return [];
    const metadata = (step as { providerMetadata?: unknown }).providerMetadata;
    if (!metadata || typeof metadata !== "object") return [];
    const gatewayMetadata = (metadata as Record<string, unknown>).gateway;
    if (!gatewayMetadata || typeof gatewayMetadata !== "object") return [];
    const rawCost = (gatewayMetadata as Record<string, unknown>).cost;
    const cost =
      typeof rawCost === "number"
        ? rawCost
        : typeof rawCost === "string"
          ? Number(rawCost)
          : Number.NaN;
    return Number.isFinite(cost) && cost >= 0 ? [cost] : [];
  });
  const gatewayCostUsd = gatewayCosts.reduce((total, cost) => total + cost, 0);
  const toolNames = [
    ...new Set(
      toolCalls.flatMap((call) =>
        call &&
        typeof call === "object" &&
        typeof (call as { toolName?: unknown }).toolName === "string"
          ? [(call as { toolName: string }).toolName]
          : [],
      ),
    ),
  ].sort();
  return {
    ...(typeof usage.inputTokens === "number"
      ? { inputTokens: usage.inputTokens }
      : {}),
    ...(typeof usage.outputTokens === "number"
      ? { outputTokens: usage.outputTokens }
      : {}),
    ...(typeof usage.totalTokens === "number"
      ? { totalTokens: usage.totalTokens }
      : {}),
    ...(steps.length ? { steps: steps.length } : {}),
    ...(toolCalls.length ? { toolCalls: toolCalls.length } : {}),
    ...(generationIds.length ? { generationIds } : {}),
    ...(typeof value.finishReason === "string"
      ? { finishReason: value.finishReason }
      : {}),
    ...(Array.isArray(value.warnings)
      ? { warningCount: value.warnings.length }
      : {}),
    ...(toolNames.length ? { toolNames } : {}),
    ...(gatewayCosts.length ? { gatewayCostUsd } : {}),
  };
}

export function mergeRunnerTelemetry(
  previous: NonNullable<EditorAiRunnerOutput["telemetry"]> | undefined,
  next: NonNullable<EditorAiRunnerOutput["telemetry"]>,
): NonNullable<EditorAiRunnerOutput["telemetry"]> {
  if (!previous) return next;
  const sum = (
    key:
      | "inputTokens"
      | "outputTokens"
      | "totalTokens"
      | "steps"
      | "toolCalls"
      | "warningCount"
      | "gatewayCostUsd",
  ) => (previous[key] ?? 0) + (next[key] ?? 0);
  return {
    inputTokens: sum("inputTokens"),
    outputTokens: sum("outputTokens"),
    totalTokens: sum("totalTokens"),
    steps: sum("steps"),
    toolCalls: sum("toolCalls"),
    generationIds: [
      ...(previous.generationIds ?? []),
      ...(next.generationIds ?? []),
    ],
    ...(next.finishReason ? { finishReason: next.finishReason } : {}),
    warningCount: sum("warningCount"),
    toolNames: [
      ...new Set([...(previous.toolNames ?? []), ...(next.toolNames ?? [])]),
    ].sort(),
    gatewayCostUsd: sum("gatewayCostUsd"),
  };
}

export function assertRunnerBudget(
  telemetry: NonNullable<EditorAiRunnerOutput["telemetry"]>,
  budget: EditorAiRunBudget,
): void {
  if (
    telemetry.inputTokens === undefined ||
    telemetry.outputTokens === undefined ||
    telemetry.steps === undefined ||
    telemetry.gatewayCostUsd === undefined
  ) {
    throw new Error(
      "AI Gateway did not return complete usage and cost accounting",
    );
  }
  if (telemetry.steps > budget.maxRequests) {
    throw new Error("Editor AI request budget exceeded");
  }
  if (telemetry.inputTokens > budget.maxInputTokens) {
    throw new Error("Editor AI input-token budget exceeded");
  }
  if (telemetry.outputTokens > budget.maxOutputTokens) {
    throw new Error("Editor AI output-token budget exceeded");
  }
  if (telemetry.gatewayCostUsd > budget.maxSpendUsd) {
    throw new Error("Editor AI spend budget exceeded");
  }
}

export async function repairInvalidWorkspace<T>(input: {
  result: T;
  validate: () => Promise<WorkspaceValidationSummary>;
  repair: (
    diagnostics: WorkspaceValidationSummary["diagnostics"],
  ) => PromiseLike<T>;
  abortSignal: AbortSignal;
  maxRepairs?: number;
}): Promise<T> {
  const maxRepairs = input.maxRepairs ?? 2;
  if (!Number.isSafeInteger(maxRepairs) || maxRepairs < 0 || maxRepairs > 5) {
    throw new RangeError("Workspace repair attempts must be between 0 and 5");
  }
  let result = input.result;
  for (let repairAttempt = 0; repairAttempt < maxRepairs; repairAttempt += 1) {
    input.abortSignal.throwIfAborted();
    const validation = await input.validate();
    if (validation.valid) return result;
    result = await input.repair(validation.diagnostics);
  }
  return result;
}

class EditorWorkspaceRunner implements EditorAiRunner {
  readonly modelId: string;

  constructor(private readonly env: NodeJS.ProcessEnv) {
    this.modelId = env.EDITOR_AI_MODEL ?? "";
  }

  async run(input: EditorAiRunnerInput): Promise<EditorAiRunnerOutput> {
    const readiness = getEditorAiReadiness(this.env);
    if (!readiness.ready) {
      throw new EditorAiConfigurationError(
        `Editor AI is not ready: ${readiness.missing.join(", ")}`,
      );
    }
    if (!this.modelId) {
      throw new EditorAiConfigurationError("EDITOR_AI_MODEL is missing");
    }
    const store = new InMemoryWorkspaceFileStore(input.materialization.files);
    const validateWorkspace = async (): Promise<WorkspaceValidationSummary> => {
      const imported = await importProjectWorkspace(
        input.materialization.baseline,
        store,
        {
          documentValidation: { contract: baseBlocksDocumentContract },
          validateDocument: (document) => assertBaseBlocksDocument(document),
        },
      );
      return imported.ok
        ? { valid: true, diagnostics: [] }
        : {
            valid: false,
            diagnostics: imported.diagnostics
              .slice(0, 50)
              .map(({ code, message, path, pageId }) => ({
                code,
                message,
                ...(path ? { path } : {}),
                ...(pageId ? { pageId } : {}),
              })),
          };
    };
    const createAgent = (budget: {
      maxRequests: number;
      maxOutputTokens: number;
    }) =>
      createEditorWorkspaceAgent({
        model: gateway(this.modelId),
        store,
        maxRequests: Math.min(40, budget.maxRequests),
        maxOutputTokens: budget.maxOutputTokens,
        validateWorkspace,
      });
    let agent = createAgent(input.budget);
    let result = await agent.generate({
      prompt: input.prompt,
      abortSignal: input.abortSignal,
    });
    const initialTelemetry = sanitizeRunnerTelemetry(result);
    if (!initialTelemetry) {
      throw new Error("AI Gateway did not return run telemetry");
    }
    let telemetry: NonNullable<EditorAiRunnerOutput["telemetry"]> =
      initialTelemetry;
    assertRunnerBudget(telemetry, input.budget);
    result = await repairInvalidWorkspace({
      result,
      validate: validateWorkspace,
      abortSignal: input.abortSignal,
      repair: async (diagnostics) => {
        const remainingRequests =
          input.budget.maxRequests - (telemetry.steps ?? 0);
        const remainingOutputTokens =
          input.budget.maxOutputTokens - (telemetry.outputTokens ?? 0);
        if (remainingRequests < 1 || remainingOutputTokens < 1) {
          throw new Error("Editor AI repair budget exhausted");
        }
        agent = createAgent({
          maxRequests: remainingRequests,
          maxOutputTokens: remainingOutputTokens,
        });
        const repaired = await agent.generate({
          prompt:
            "The host rejected the current workspace. Repair every diagnostic " +
            "without changing the user's intent, validate the complete workspace, " +
            "and finish only when it is valid. Diagnostics:\n" +
            JSON.stringify(diagnostics),
          abortSignal: input.abortSignal,
        });
        const repairTelemetry = sanitizeRunnerTelemetry(repaired);
        if (!repairTelemetry) {
          throw new Error("AI Gateway did not return repair telemetry");
        }
        telemetry = mergeRunnerTelemetry(telemetry, repairTelemetry);
        assertRunnerBudget(telemetry, input.budget);
        return repaired;
      },
    });
    return {
      store,
      summary: result.text,
      telemetry,
    };
  }
}

export function createProductionEditorAiRunner(
  env: NodeJS.ProcessEnv = process.env,
): EditorAiRunner {
  return new EditorWorkspaceRunner(env);
}
