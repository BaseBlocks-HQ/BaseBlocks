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
import {
  gatewayUsdToProviderCostUnits,
  gatewayUsdToRetailCreditUnits,
} from "./gateway-accounting";

export class EditorAiRunnerFailure extends Error {
  readonly telemetry: NonNullable<EditorAiRunnerOutput["telemetry"]>;

  constructor(
    cause: unknown,
    telemetry: NonNullable<EditorAiRunnerOutput["telemetry"]>,
  ) {
    super(
      cause instanceof Error ? cause.message : "AI Gateway request failed",
      {
        cause,
      },
    );
    this.name = "EditorAiRunnerFailure";
    this.telemetry = telemetry;
  }
}

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
  };
}

type GatewayGenerationInfo = Awaited<
  ReturnType<typeof gateway.getGenerationInfo>
>;

type GatewayAccountingDependencies = {
  getGenerationInfo?: (id: string) => Promise<GatewayGenerationInfo>;
  retryDelaysMs?: readonly number[];
  sleep?: (milliseconds: number) => Promise<void>;
};

export async function resolveGatewayAccounting(
  generationIds: string[],
  requestedModelId: string,
  environment: "sandbox" | "production",
  dependencies: GatewayAccountingDependencies = {},
) {
  const uniqueGenerationIds = [...new Set(generationIds)];
  if (uniqueGenerationIds.length === 0) return {};
  const getGenerationInfo =
    dependencies.getGenerationInfo ??
    ((id: string) => gateway.getGenerationInfo({ id }));
  const retryDelaysMs = dependencies.retryDelaysMs ?? [];
  const sleep =
    dependencies.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const generationsById = new Map<string, GatewayGenerationInfo>();
  let pendingIds = uniqueGenerationIds;

  for (let attempt = 0; pendingIds.length > 0; attempt += 1) {
    const results = await Promise.allSettled(
      pendingIds.map((id) => getGenerationInfo(id)),
    );
    const unresolved: string[] = [];
    results.forEach((result, index) => {
      const id = pendingIds[index];
      if (!id) return;
      if (result.status === "fulfilled") {
        generationsById.set(id, result.value);
      } else {
        unresolved.push(id);
      }
    });
    pendingIds = unresolved;
    if (pendingIds.length === 0 || attempt >= retryDelaysMs.length) break;
    await sleep(retryDelaysMs[attempt] ?? 0);
  }

  if (pendingIds.length > 0) {
    return {
      requestedModelId,
      environment,
      feature: "editorAgent" as const,
    };
  }
  const generations = uniqueGenerationIds.map((id) => {
    const generation = generationsById.get(id);
    if (!generation)
      throw new Error("Gateway generation accounting is incomplete");
    return generation;
  });
  return {
    generationSummaries: generations.map((generation) => ({
      generationId: generation.id,
      totalCostUnits: gatewayUsdToProviderCostUnits(generation.totalCost),
      retailChargeUnits: gatewayUsdToRetailCreditUnits(generation.totalCost),
      resolvedModelId: generation.model,
      provider: generation.providerName,
      inputTokens: generation.promptTokens,
      outputTokens: generation.completionTokens,
      reasoningTokens: generation.reasoningTokens,
      cachedInputTokens: generation.cachedTokens,
      cacheCreationTokens: generation.cacheCreationTokens,
      webSearchCalls: generation.billableWebSearchCalls,
      latencyMs: generation.latency,
      finishReason: generation.finishReason,
    })),
    gatewayCostUnits: generations.reduce(
      (sum, generation) =>
        sum + gatewayUsdToProviderCostUnits(generation.totalCost),
      0n,
    ),
    retailChargeUnits: generations.reduce(
      (sum, generation) =>
        sum + gatewayUsdToRetailCreditUnits(generation.totalCost),
      0n,
    ),
    gatewayCostUsd: generations.reduce(
      (sum, generation) => sum + generation.totalCost,
      0,
    ),
    requestedModelId,
    resolvedModelId:
      new Set(generations.map((generation) => generation.model)).size === 1
        ? generations[0]?.model
        : undefined,
    provider:
      new Set(generations.map((generation) => generation.providerName)).size ===
      1
        ? generations[0]?.providerName
        : "multiple",
    environment,
    feature: "editorAgent",
  };
}

export function assertRunnerBudget(
  telemetry: NonNullable<EditorAiRunnerOutput["telemetry"]>,
  budget: EditorAiRunBudget,
): void {
  if (
    telemetry.inputTokens === undefined ||
    telemetry.outputTokens === undefined ||
    telemetry.steps === undefined
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
  if (
    telemetry.retailChargeUnits !== undefined &&
    telemetry.retailChargeUnits > budget.maxChargeUnits
  ) {
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
      maxInputTokens: input.budget.maxInputTokens,
      maxOutputTokens: input.budget.maxOutputTokens,
      validateWorkspace,
      providerOptions: {
        gateway: {
          user: input.attribution.actorId,
          tags: [
            `workspace:${input.attribution.organizationId}`,
            `feature:${input.attribution.feature}`,
            `env:${input.attribution.environment}`,
            `run:${input.attribution.runId}`,
            `policy:${input.attribution.policyVersion}`,
          ],
        },
      },
    });
    let result: Awaited<ReturnType<typeof session.agent.generate>>;
    try {
      result = await session.agent.generate({
        prompt: input.prompt,
        abortSignal: input.abortSignal,
      });
    } catch (error) {
      const generationId =
        error &&
        typeof error === "object" &&
        typeof (error as { generationId?: unknown }).generationId === "string"
          ? (error as { generationId: string }).generationId
          : undefined;
      if (generationId) {
        throw new EditorAiRunnerFailure(error, {
          generationIds: [generationId],
          ...(await resolveGatewayAccounting(
            [generationId],
            this.modelId,
            input.attribution.environment,
          )),
        });
      }
      throw error;
    }
    const baseTelemetry = sanitizeRunnerTelemetry(result);
    const telemetry = baseTelemetry
      ? {
          ...baseTelemetry,
          ...(await resolveGatewayAccounting(
            baseTelemetry.generationIds ?? [],
            this.modelId,
            input.attribution.environment,
          )),
        }
      : undefined;
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
