import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation } from "./_generated/server";
import {
  assertAiRunTransition,
  assertAiRunCapacity,
  assertAiRunCreditDeliveryStatus,
  type AiRunPolicy,
} from "./model/aiRunPolicy";
import { requireOrganizationPermission } from "./permissions";
import { appendCompletedAssistantMessage } from "./aiConversations";
import { aiRunTelemetry } from "./validators/ai";
import {
  finalizeAiReservation,
  reserveAiCredits,
  resolveBillingEnvironment,
} from "./model/aiCredits";

const LEASE_MS = 5 * 60_000;

function conflict(message: string): never {
  throw new ConvexError({ code: "AI_RUN_CONFLICT", message });
}

async function recordGatewayGenerations(
  ctx: Parameters<typeof finalizeAiReservation>[0],
  run: Doc<"aiRuns">,
  telemetry: {
    generationIds?: string[];
    generationSummaries?: Array<{
      generationId: string;
      totalCostUnits: bigint;
      retailChargeUnits: bigint;
      resolvedModelId: string;
      provider: string;
      inputTokens: number;
      outputTokens: number;
      reasoningTokens: number;
      cachedInputTokens: number;
      cacheCreationTokens: number;
      webSearchCalls: number;
      latencyMs: number;
      finishReason: string;
    }>;
  },
  now: number,
) {
  if (!run.creditReservationId) return;
  const summaries = new Map(
    (telemetry.generationSummaries ?? []).map((summary) => [
      summary.generationId,
      summary,
    ]),
  );
  for (const generationId of new Set(telemetry.generationIds ?? [])) {
    const existing = await ctx.db
      .query("aiGatewayGenerations")
      .withIndex("by_generation", (q) => q.eq("generationId", generationId))
      .unique();
    if (existing) {
      if (existing.reservationId !== run.creditReservationId) {
        conflict("AI Gateway generation is linked to another reservation");
      }
      continue;
    }
    const summary = summaries.get(generationId);
    await ctx.db.insert("aiGatewayGenerations", {
      generationId,
      reservationId: run.creditReservationId,
      runId: run._id,
      organizationId: run.organizationId,
      actorId: run.actorId,
      siteId: run.siteId,
      requestId: run.requestId,
      feature: run.feature ?? "editorAgent",
      providerEnvironment: run.providerEnvironment ?? "sandbox",
      requestedModelId: run.modelId,
      resolvedModelId: summary?.resolvedModelId,
      provider: summary?.provider,
      status: summary ? "costed" : "reconcilePending",
      totalCostUnits: summary?.totalCostUnits,
      retailChargeUnits: summary?.retailChargeUnits,
      inputTokens: summary?.inputTokens,
      outputTokens: summary?.outputTokens,
      reasoningTokens: summary?.reasoningTokens,
      cachedInputTokens: summary?.cachedInputTokens,
      cacheCreationTokens: summary?.cacheCreationTokens,
      webSearchCalls: summary?.webSearchCalls,
      latencyMs: summary?.latencyMs,
      finishReason: summary?.finishReason,
      observedAt: now,
      reconciledAt: summary ? now : undefined,
      updatedAt: now,
    });
  }
}

export const begin = mutation({
  args: {
    siteId: v.id("sites"),
    requestId: v.string(),
    promptFingerprint: v.string(),
    modelId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.requestId.length < 16 || args.requestId.length > 200) {
      conflict("Invalid idempotency key");
    }
    if (!/^[a-f0-9]{64}$/.test(args.promptFingerprint)) {
      conflict("Invalid prompt fingerprint");
    }
    if (!args.modelId.trim() || args.modelId.length > 200) {
      conflict("Invalid model ID");
    }
    const site = await ctx.db.get(args.siteId);
    if (!site) throw new ConvexError("Site not found");
    const { auth } = await requireOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "content", action: "edit" },
    );
    const existing = await ctx.db
      .query("aiRuns")
      .withIndex("by_site_actor_request", (q) =>
        q
          .eq("siteId", site._id)
          .eq("actorId", auth.userId)
          .eq("requestId", args.requestId),
      )
      .unique();
    if (existing) {
      if (
        existing.promptFingerprint !== args.promptFingerprint ||
        existing.modelId !== args.modelId ||
        existing.mode !== "apply"
      ) {
        conflict("Idempotency key was already used for a different run");
      }
      if (existing.status === "completed") {
        return {
          state: "replay",
          runId: existing._id,
          result: existing.result,
        };
      }
      if (
        existing.status === "running" &&
        existing.leaseExpiresAt > Date.now()
      ) {
        conflict("An identical Editor AI run is already in progress");
      }
      conflict("This AI request ID has already reached a terminal state");
    }

    const now = Date.now();
    const providerEnvironment = resolveBillingEnvironment(
      process.env.BASEBLOCKS_BILLING_ENVIRONMENT,
    );
    const creditDecision = await reserveAiCredits(ctx, {
      organizationId: site.organizationId,
      actorId: auth.userId,
      siteId: site._id,
      requestId: args.requestId,
      promptFingerprint: args.promptFingerprint,
      feature: "editorAgent",
      providerEnvironment,
      modelId: args.modelId,
      now,
      expiresAt: now + LEASE_MS,
    });
    if (creditDecision.replay) {
      conflict("This paid AI reservation already exists");
    }
    const policy: AiRunPolicy = {
      dailyRunLimit: creditDecision.rateCard.dailyRunLimit,
      maxActorConcurrency: creditDecision.rateCard.maxActorConcurrency,
      maxSiteConcurrency: creditDecision.rateCard.maxSiteConcurrency,
      maxOrganizationConcurrency:
        creditDecision.rateCard.maxOrganizationConcurrency,
      maxRequestsPerRun: creditDecision.rateCard.maxRequestsPerRun,
      maxInputTokensPerRun: creditDecision.rateCard.maxInputTokensPerRun,
      maxOutputTokensPerRun: creditDecision.rateCard.maxOutputTokensPerRun,
      maxSpendUsdPerRun:
        Number(creditDecision.rateCard.maxChargeUnits) / 1_000_000,
    };
    const actorLimit = policy.maxActorConcurrency;
    const siteLimit = policy.maxSiteConcurrency;
    const organizationLimit = policy.maxOrganizationConcurrency;
    const dailyRunLimit = policy.dailyRunLimit;
    const dayStart = now - 24 * 60 * 60_000;
    const [actorActive, siteActive, organizationActive, recentRuns] =
      await Promise.all([
        ctx.db
          .query("aiRuns")
          .withIndex("by_actor_status_lease", (q) =>
            q
              .eq("actorId", auth.userId)
              .eq("status", "running")
              .gte("leaseExpiresAt", now),
          )
          .take(actorLimit),
        ctx.db
          .query("aiRuns")
          .withIndex("by_site_status_lease", (q) =>
            q
              .eq("siteId", site._id)
              .eq("status", "running")
              .gte("leaseExpiresAt", now),
          )
          .take(siteLimit),
        ctx.db
          .query("aiRuns")
          .withIndex("by_org_status_lease", (q) =>
            q
              .eq("organizationId", site.organizationId)
              .eq("status", "running")
              .gte("leaseExpiresAt", now),
          )
          .take(organizationLimit),
        ctx.db
          .query("aiRuns")
          .withIndex("by_org_created", (q) =>
            q
              .eq("organizationId", site.organizationId)
              .gte("createdAt", dayStart),
          )
          .take(dailyRunLimit),
      ]);
    try {
      assertAiRunCapacity({
        policy,
        actorActive: actorActive.length,
        siteActive: siteActive.length,
        organizationActive: organizationActive.length,
        recentRuns: recentRuns.length,
      });
    } catch (error) {
      conflict(
        error instanceof Error ? error.message : "Editor AI quota reached",
      );
    }

    const value = {
      siteId: site._id,
      organizationId: site.organizationId,
      actorId: auth.userId,
      requestId: args.requestId,
      promptFingerprint: args.promptFingerprint,
      modelId: args.modelId,
      mode: "apply" as const,
      status: "running" as const,
      leaseExpiresAt: now + LEASE_MS,
      creditReservationId: creditDecision.reservation._id,
      maximumCreditUnits: creditDecision.reservation.maximumUnits,
      creditStatus: "reserved" as const,
      creditPolicyVersion: creditDecision.reservation.policyVersion,
      feature: "editorAgent",
      providerEnvironment,
      createdAt: now,
      updatedAt: now,
    };
    const runId = await ctx.db.insert("aiRuns", value);
    await ctx.db.patch(creditDecision.reservation._id, { aiRunId: runId });
    return {
      state: "admitted",
      runId,
      budget: {
        maxRequests: policy.maxRequestsPerRun,
        maxInputTokens: policy.maxInputTokensPerRun,
        maxOutputTokens: policy.maxOutputTokensPerRun,
        maxChargeUnits: creditDecision.reservation.maximumUnits,
      },
      attribution: {
        organizationId: site.organizationId,
        actorId: auth.userId,
        feature: "editorAgent",
        environment: providerEnvironment,
        policyVersion: creditDecision.reservation.policyVersion,
      },
    };
  },
});

export const settle = mutation({
  args: {
    runId: v.id("aiRuns"),
    telemetry: aiRunTelemetry,
  },
  returns: v.union(
    v.literal("settled"),
    v.literal("released"),
    v.literal("reconcilePending"),
  ),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new ConvexError("AI run not found");
    const site = await ctx.db.get(run.siteId);
    if (!site) throw new ConvexError("Site not found");
    const { auth } = await requireOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "content", action: "edit" },
    );
    if (auth.userId !== run.actorId)
      conflict("AI run belongs to another actor");
    if (!run.creditReservationId) {
      throw new ConvexError({
        code: "AI_CREDIT_RESERVATION_MISSING",
        message: "AI run has no paid-credit reservation",
      });
    }
    const now = Date.now();
    await recordGatewayGenerations(ctx, run, args.telemetry, now);
    const status = await finalizeAiReservation(ctx, {
      reservationId: run.creditReservationId,
      actualUnits: args.telemetry.retailChargeUnits,
      generationIds: args.telemetry.generationIds ?? [],
      now,
    });
    await ctx.db.patch(run._id, {
      telemetry: args.telemetry,
      creditStatus: status,
      settledCreditUnits:
        status === "settled" || status === "released"
          ? (args.telemetry.retailChargeUnits ?? 0n)
          : undefined,
      updatedAt: now,
    });
    return status;
  },
});

export const fail = mutation({
  args: {
    runId: v.id("aiRuns"),
    failureCode: v.string(),
    failureMessage: v.optional(v.string()),
    telemetry: v.optional(aiRunTelemetry),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new ConvexError("AI run not found");
    const site = await ctx.db.get(run.siteId);
    if (!site) throw new ConvexError("Site not found");
    const { auth } = await requireOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "content", action: "edit" },
    );
    if (auth.userId !== run.actorId)
      conflict("AI run belongs to another actor");
    const now = Date.now();
    try {
      assertAiRunTransition(run, "failed", now);
    } catch (error) {
      conflict(
        error instanceof Error ? error.message : "Invalid AI run transition",
      );
    }
    let creditStatus = run.creditStatus;
    let settledCreditUnits = run.settledCreditUnits;
    if (run.creditReservationId && creditStatus === "reserved") {
      if (args.telemetry) {
        await recordGatewayGenerations(ctx, run, args.telemetry, now);
      }
      creditStatus = await finalizeAiReservation(ctx, {
        reservationId: run.creditReservationId,
        actualUnits: args.telemetry?.retailChargeUnits,
        generationIds: args.telemetry?.generationIds ?? [],
        failureCode: args.failureCode.slice(0, 100),
        now,
      });
      settledCreditUnits =
        creditStatus === "settled" || creditStatus === "released"
          ? (args.telemetry?.retailChargeUnits ?? 0n)
          : undefined;
    }
    await ctx.db.patch(run._id, {
      status: "failed",
      failureCode: args.failureCode.slice(0, 100),
      failureMessage: args.failureMessage?.slice(0, 2_000),
      telemetry: args.telemetry,
      creditStatus,
      settledCreditUnits,
      outcome: undefined,
      result: undefined,
      leaseExpiresAt: now,
      completedAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const completeAnswer = mutation({
  args: {
    runId: v.id("aiRuns"),
    conversationId: v.optional(v.id("aiConversations")),
    summary: v.string(),
    telemetry: v.optional(aiRunTelemetry),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new ConvexError("AI run not found");
    const site = await ctx.db.get(run.siteId);
    if (!site) throw new ConvexError("Site not found");
    const { auth } = await requireOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "content", action: "edit" },
    );
    if (auth.userId !== run.actorId) {
      conflict("AI run belongs to another actor");
    }
    const summary = args.summary.trim().slice(0, 8_000);
    if (!summary) conflict("AI answer has no content");
    const now = Date.now();
    try {
      assertAiRunTransition(run, "completed", now);
    } catch (error) {
      conflict(
        error instanceof Error ? error.message : "Invalid AI run transition",
      );
    }
    try {
      assertAiRunCreditDeliveryStatus(run.creditStatus ?? "reserved");
    } catch (error) {
      conflict(error instanceof Error ? error.message : "Invalid AI credits");
    }
    const result = {
      replayed: true as const,
      outcome: "answered" as const,
      summary,
      diagnostics: [],
    };
    await ctx.db.patch(run._id, {
      status: "completed",
      outcome: "answered",
      telemetry: args.telemetry,
      failureCode: undefined,
      failureMessage: undefined,
      result,
      leaseExpiresAt: now,
      completedAt: now,
      updatedAt: now,
    });
    if (args.conversationId) {
      await appendCompletedAssistantMessage(ctx, {
        conversationId: args.conversationId,
        siteId: site._id,
        actorId: auth.userId,
        requestId: run.requestId,
        content: summary,
        createdAt: now,
      });
    }
    return null;
  },
});
