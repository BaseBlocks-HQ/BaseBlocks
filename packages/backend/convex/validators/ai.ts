import { v } from "convex/values";

export const aiRunTelemetry = v.object({
  inputTokens: v.optional(v.number()),
  outputTokens: v.optional(v.number()),
  totalTokens: v.optional(v.number()),
  steps: v.optional(v.number()),
  toolCalls: v.optional(v.number()),
  generationIds: v.optional(v.array(v.string())),
  finishReason: v.optional(v.string()),
  warningCount: v.optional(v.number()),
  toolNames: v.optional(v.array(v.string())),
  gatewayCostUsd: v.optional(v.number()),
});

export const aiRunOutcome = v.union(
  v.literal("answered"),
  v.literal("applied"),
);
