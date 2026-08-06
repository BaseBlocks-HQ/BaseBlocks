import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import {
  assertAiRunTransition,
  assertAiRunCapacity,
  resolveAiRunPolicy,
  type AiRunPolicy,
} from "./model/aiRunPolicy";
import { requireOrganizationPermission } from "./permissions";
import { appendCompletedAssistantMessage } from "./aiConversations";
import { aiRunTelemetry } from "./validators/ai";

const LEASE_MS = 5 * 60_000;

function conflict(message: string): never {
  throw new ConvexError({ code: "AI_RUN_CONFLICT", message });
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
    const entitlement = await ctx.db
      .query("aiOrganizationEntitlements")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", site.organizationId),
      )
      .unique();
    let policy: AiRunPolicy;
    try {
      policy = resolveAiRunPolicy(entitlement);
    } catch (error) {
      throw new ConvexError({
        code: "AI_ADMISSION_NOT_CONFIGURED",
        message:
          error instanceof Error
            ? error.message
            : "Invalid Editor AI entitlement",
      });
    }
    const actorLimit = policy.maxActorConcurrency;
    const siteLimit = policy.maxSiteConcurrency;
    const organizationLimit = policy.maxOrganizationConcurrency;
    const dailyRunLimit = policy.dailyRunLimit;
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
    }

    const now = Date.now();
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
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const runId = existing?._id ?? (await ctx.db.insert("aiRuns", value));
    if (existing) {
      await ctx.db.replace(existing._id, value);
    }
    return {
      state: "admitted",
      runId,
      budget: {
        maxRequests: policy.maxRequestsPerRun,
        maxInputTokens: policy.maxInputTokensPerRun,
        maxOutputTokens: policy.maxOutputTokensPerRun,
        maxSpendUsd: policy.maxSpendUsdPerRun,
      },
    };
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
    await ctx.db.patch(run._id, {
      status: "failed",
      failureCode: args.failureCode.slice(0, 100),
      failureMessage: args.failureMessage?.slice(0, 2_000),
      telemetry: args.telemetry,
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
