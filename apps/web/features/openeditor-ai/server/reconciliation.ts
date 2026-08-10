import "server-only";

import { gateway } from "ai";
import { createHmac } from "node:crypto";
import { api, type Id } from "@baseblocks/backend";
import { getServerConvexClient } from "@/lib/convex/server";
import {
  gatewayUsdToProviderCostUnits,
  gatewayUsdToRetailCreditUnits,
} from "./gateway-accounting";

type ReconciliationResult = {
  scanned: number;
  reconciled: number;
  pending: number;
};

function sign(secret: string, operation: string, timestamp: number) {
  return createHmac("sha256", secret)
    .update(`${operation}:${timestamp}`)
    .digest("hex");
}

export async function reconcileHostedAiReservations(
  env: NodeJS.ProcessEnv = process.env,
  runId?: Id<"aiRuns">,
): Promise<ReconciliationResult> {
  const reconciliationSecret = env.AI_RECONCILIATION_SECRET;
  if (!reconciliationSecret) {
    throw new Error("AI_RECONCILIATION_SECRET is not configured");
  }
  const convex = getServerConvexClient();
  const listTimestamp = Date.now();
  const candidates = await convex.query(
    api.aiCredits.listHostedReconciliationCandidates,
    {
      timestamp: listTimestamp,
      signature: sign(reconciliationSecret, "list", listTimestamp),
      limit: 20,
      runId,
    },
  );
  let reconciled = 0;
  let pending = 0;
  for (const candidate of candidates) {
    if (candidate.generationIds.length === 0) {
      pending += 1;
      continue;
    }
    try {
      const generations = await Promise.all(
        candidate.generationIds.map((id) => gateway.getGenerationInfo({ id })),
      );
      const settleTimestamp = Date.now();
      await convex.mutation(api.aiCredits.reconcileHostedReservation, {
        timestamp: settleTimestamp,
        signature: sign(
          reconciliationSecret,
          `settle:${candidate.reservationId}`,
          settleTimestamp,
        ),
        reservationId: candidate.reservationId,
        generations: generations.map((generation) => ({
          generationId: generation.id,
          totalCostUnits: gatewayUsdToProviderCostUnits(generation.totalCost),
          retailChargeUnits: gatewayUsdToRetailCreditUnits(
            generation.totalCost,
          ),
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
      });
      reconciled += 1;
    } catch {
      pending += 1;
    }
  }
  return { scanned: candidates.length, reconciled, pending };
}

export async function reconcileHostedAiReservationsWithBackoff(
  env: NodeJS.ProcessEnv = process.env,
  retryDelaysMs: readonly number[] = [5_000, 10_000, 20_000, 40_000],
  runId?: Id<"aiRuns">,
): Promise<ReconciliationResult> {
  let result: ReconciliationResult = { scanned: 0, reconciled: 0, pending: 0 };
  for (const delayMs of retryDelaysMs) {
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    result = await reconcileHostedAiReservations(env, runId);
    if (result.pending === 0) break;
  }
  return result;
}
