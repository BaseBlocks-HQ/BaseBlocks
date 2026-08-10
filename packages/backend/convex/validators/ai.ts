import { v } from "convex/values";

export const aiGatewayGenerationSummary = v.object({
  generationId: v.string(),
  totalCostUnits: v.int64(),
  retailChargeUnits: v.int64(),
  resolvedModelId: v.string(),
  provider: v.string(),
  inputTokens: v.number(),
  outputTokens: v.number(),
  reasoningTokens: v.number(),
  cachedInputTokens: v.number(),
  cacheCreationTokens: v.number(),
  webSearchCalls: v.number(),
  latencyMs: v.number(),
  finishReason: v.string(),
});

export const aiRunTelemetry = v.object({
  inputTokens: v.optional(v.number()),
  outputTokens: v.optional(v.number()),
  totalTokens: v.optional(v.number()),
  steps: v.optional(v.number()),
  toolCalls: v.optional(v.number()),
  generationIds: v.optional(v.array(v.string())),
  generationSummaries: v.optional(v.array(aiGatewayGenerationSummary)),
  finishReason: v.optional(v.string()),
  warningCount: v.optional(v.number()),
  toolNames: v.optional(v.array(v.string())),
  gatewayCostUsd: v.optional(v.number()),
  gatewayCostUnits: v.optional(v.int64()),
  retailChargeUnits: v.optional(v.int64()),
  requestedModelId: v.optional(v.string()),
  resolvedModelId: v.optional(v.string()),
  provider: v.optional(v.string()),
  environment: v.optional(
    v.union(v.literal("sandbox"), v.literal("production")),
  ),
  feature: v.optional(v.string()),
});

export const aiRunOutcome = v.union(
  v.literal("answered"),
  v.literal("applied"),
);
