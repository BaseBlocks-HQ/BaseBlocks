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
      const hasChanges = imported.ok
        ? imported.changeset.pageChanges.length > 0 ||
          imported.project.title !==
            input.materialization.baseline.project.title ||
          imported.project.metadata?.defaultPageId !==
            input.materialization.baseline.project.metadata?.defaultPageId
        : false;
      return imported.ok
        ? { valid: true, hasChanges, diagnostics: [] }
        : {
            valid: false,
            hasChanges: false,
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
    const session = createEditorWorkspaceAgent({
      model: gateway(this.modelId),
      store,
      maxRequests: Math.min(40, input.budget.maxRequests),
      maxOutputTokens: input.budget.maxOutputTokens,
      validateWorkspace,
    });
    const result = await session.agent.generate({
      prompt: input.prompt,
      abortSignal: input.abortSignal,
    });
    const telemetry = sanitizeRunnerTelemetry(result);
    if (!telemetry) {
      throw new Error("AI Gateway did not return run telemetry");
    }
    assertRunnerBudget(telemetry, input.budget);
    const completion = session.getCompletion();
    if (!completion) {
      throw new Error(
        "Editor agent exhausted its request budget without completing the task",
      );
    }
    return {
      store,
      outcome: completion.outcome,
      summary: completion.summary,
      telemetry,
    };
  }
}

export function createProductionEditorAiRunner(
  env: NodeJS.ProcessEnv = process.env,
): EditorAiRunner {
  return new EditorWorkspaceRunner(env);
}
