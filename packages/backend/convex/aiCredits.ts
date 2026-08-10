import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import {
  requireOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";
import {
  finalizeAiReservation,
  grantAiCredits,
  resolveBillingEnvironment,
} from "./model/aiCredits";
import { aiGatewayGenerationSummary } from "./validators/ai";

const environment = v.union(v.literal("sandbox"), v.literal("production"));

function requirePositiveUnits(units: bigint) {
  if (units <= 0n) {
    throw new ConvexError({
      code: "INVALID_CREDIT_UNITS",
      message: "AI credit units must be positive",
    });
  }
}

async function requireReconciliationAuthorization(
  timestamp: number,
  signature: string,
  operation: string,
) {
  const configured = process.env.AI_RECONCILIATION_SECRET;
  if (
    !configured ||
    configured.length < 32 ||
    !Number.isSafeInteger(timestamp) ||
    Math.abs(Date.now() - timestamp) > 5 * 60_000
  ) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "AI reconciliation authorization failed",
    });
  }
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(configured),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${operation}:${timestamp}`),
  );
  const expected = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  if (signature.length !== expected.length) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "AI reconciliation authorization failed",
    });
  }
  let difference = 0;
  for (let index = 0; index < signature.length; index += 1) {
    difference |= signature.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  if (difference !== 0) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "AI reconciliation authorization failed",
    });
  }
}

function ceilDiv(numerator: bigint, denominator: bigint) {
  return (numerator + denominator - 1n) / denominator;
}

export function minimumRateCardCharge(input: {
  inputUnitsPerMillionTokens: bigint;
  outputUnitsPerMillionTokens: bigint;
  maxInputTokensPerRun: number;
  maxOutputTokensPerRun: number;
  safetyBufferBps: number;
}) {
  const base =
    ceilDiv(
      input.inputUnitsPerMillionTokens * BigInt(input.maxInputTokensPerRun),
      1_000_000n,
    ) +
    ceilDiv(
      input.outputUnitsPerMillionTokens * BigInt(input.maxOutputTokensPerRun),
      1_000_000n,
    );
  return ceilDiv(base * BigInt(10_000 + input.safetyBufferBps), 10_000n);
}

export function resolveAiCreditAvailability(input: {
  accountStatus?: "active" | "blockedReconciliation";
  availableUnits: bigint;
  hasRateCard: boolean;
}) {
  const enabled =
    input.accountStatus === "active" &&
    input.availableUnits > 0n &&
    input.hasRateCard;
  return {
    enabled,
    reason: enabled
      ? ("available" as const)
      : !input.hasRateCard
        ? ("policyUnavailable" as const)
        : input.availableUnits <= 0n
          ? ("creditsRequired" as const)
          : ("reconciliationRequired" as const),
  };
}

export const getBalance = query({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) => {
    await requireOrganizationMember(ctx, organizationId);
    const account = await ctx.db
      .query("aiCreditAccounts")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId),
      )
      .unique();
    if (!account) {
      return {
        availableIncludedUnits: 0n,
        availablePrepaidUnits: 0n,
        reservedIncludedUnits: 0n,
        reservedPrepaidUnits: 0n,
        status: "active" as const,
      };
    }
    return {
      availableIncludedUnits: account.availableIncludedUnits,
      availablePrepaidUnits: account.availablePrepaidUnits,
      reservedIncludedUnits: account.reservedIncludedUnits,
      reservedPrepaidUnits: account.reservedPrepaidUnits,
      status: account.status,
    };
  },
});

export const getSiteAvailability = query({
  args: { siteId: v.id("sites"), modelId: v.string() },
  handler: async (ctx, args) => {
    const site = await ctx.db.get(args.siteId);
    if (!site) return { enabled: false, reason: "siteNotFound" as const };
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "content",
      action: "edit",
    });
    const providerEnvironment = resolveBillingEnvironment(
      process.env.BASEBLOCKS_BILLING_ENVIRONMENT,
    );
    const [account, cards] = await Promise.all([
      ctx.db
        .query("aiCreditAccounts")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", site.organizationId),
        )
        .unique(),
      ctx.db
        .query("aiCreditRateCards")
        .withIndex("by_model_effective", (q) =>
          q
            .eq("providerEnvironment", providerEnvironment)
            .eq("modelId", args.modelId)
            .lte("effectiveFrom", Date.now()),
        )
        .order("desc")
        .take(10),
    ]);
    const now = Date.now();
    const rateCard = cards.find(
      (card) =>
        card.active &&
        (card.effectiveThrough === undefined || card.effectiveThrough > now),
    );
    const availableUnits = account
      ? account.availableIncludedUnits + account.availablePrepaidUnits
      : 0n;
    return resolveAiCreditAvailability({
      accountStatus: account?.status,
      availableUnits,
      hasRateCard: Boolean(rateCard),
    });
  },
});

export const configureRateCard = internalMutation({
  args: {
    providerEnvironment: environment,
    policyVersion: v.string(),
    modelId: v.string(),
    inputUnitsPerMillionTokens: v.int64(),
    outputUnitsPerMillionTokens: v.int64(),
    cachedInputUnitsPerMillionTokens: v.optional(v.int64()),
    safetyBufferBps: v.number(),
    dailyRunLimit: v.number(),
    maxActorConcurrency: v.number(),
    maxSiteConcurrency: v.number(),
    maxOrganizationConcurrency: v.number(),
    maxRequestsPerRun: v.number(),
    maxInputTokensPerRun: v.number(),
    maxOutputTokensPerRun: v.number(),
    maxChargeUnits: v.int64(),
    effectiveFrom: v.number(),
    effectiveThrough: v.optional(v.number()),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    requirePositiveUnits(args.inputUnitsPerMillionTokens);
    requirePositiveUnits(args.outputUnitsPerMillionTokens);
    requirePositiveUnits(args.maxChargeUnits);
    const policyVersion = args.policyVersion.trim();
    const modelId = args.modelId.trim();
    if (!policyVersion || !modelId)
      throw new Error("Invalid AI rate card identity");
    for (const value of [
      args.dailyRunLimit,
      args.maxActorConcurrency,
      args.maxSiteConcurrency,
      args.maxOrganizationConcurrency,
      args.maxRequestsPerRun,
      args.maxInputTokensPerRun,
      args.maxOutputTokensPerRun,
    ]) {
      if (!Number.isSafeInteger(value) || value < 1) {
        throw new Error("AI rate card limits must be positive integers");
      }
    }
    if (
      !Number.isSafeInteger(args.safetyBufferBps) ||
      args.safetyBufferBps < 0 ||
      args.safetyBufferBps > 100_000
    ) {
      throw new Error("Invalid AI safety buffer");
    }
    const minimumCharge = minimumRateCardCharge(args);
    if (args.maxChargeUnits < minimumCharge) {
      throw new Error(
        `AI maxChargeUnits must cover the configured token bounds (${minimumCharge})`,
      );
    }
    const candidates = await ctx.db
      .query("aiCreditRateCards")
      .withIndex("by_environment_policy", (q) =>
        q
          .eq("providerEnvironment", args.providerEnvironment)
          .eq("policyVersion", policyVersion),
      )
      .collect();
    const existing = candidates.find((card) => card.modelId === modelId);
    const now = Date.now();
    const value = { ...args, policyVersion, modelId, updatedAt: now };
    if (existing) await ctx.db.patch(existing._id, value);
    else await ctx.db.insert("aiCreditRateCards", { ...value, createdAt: now });
    return null;
  },
});

export const grant = internalMutation({
  args: {
    organizationId: v.string(),
    bucket: v.union(v.literal("included"), v.literal("prepaid")),
    sourceKind: v.union(
      v.literal("recurring"),
      v.literal("purchase"),
      v.literal("adjustment"),
      v.literal("refund"),
    ),
    sourceRef: v.string(),
    units: v.int64(),
    periodStart: v.optional(v.number()),
    periodEnd: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    policyVersion: v.string(),
    billingEventId: v.optional(v.id("billingWebhookEvents")),
  },
  handler: async (ctx, args) => {
    requirePositiveUnits(args.units);
    return await grantAiCredits(ctx, { ...args, now: Date.now() });
  },
});

export const expireIncludedForOrganization = internalMutation({
  args: { organizationId: v.string(), now: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    const [account, lots] = await Promise.all([
      ctx.db
        .query("aiCreditAccounts")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId),
        )
        .unique(),
      ctx.db
        .query("aiCreditLots")
        .withIndex("by_org_bucket_expiry", (q) =>
          q.eq("organizationId", args.organizationId).eq("bucket", "included"),
        )
        .collect(),
    ]);
    if (!account) return 0;
    let expiredUnits = 0n;
    let expiredLots = 0;
    for (const lot of lots) {
      if (
        lot.expiresAt === undefined ||
        lot.expiresAt > now ||
        lot.availableUnits === 0n
      ) {
        continue;
      }
      const units = lot.availableUnits;
      await ctx.db.patch(lot._id, { availableUnits: 0n, updatedAt: now });
      await ctx.db.insert("aiCreditLedgerEntries", {
        organizationId: args.organizationId,
        lotId: lot._id,
        eventKind: "expire",
        bucket: "included",
        availableDeltaUnits: -units,
        reservedDeltaUnits: 0n,
        consumedDeltaUnits: 0n,
        idempotencyKey: `expire:${lot._id}:${lot.expiresAt}`,
        externalRef: lot.sourceRef,
        policyVersion: "period-expiry-v1",
        createdAt: now,
      });
      expiredUnits += units;
      expiredLots += 1;
    }
    if (expiredUnits > 0n) {
      await ctx.db.patch(account._id, {
        availableIncludedUnits: account.availableIncludedUnits - expiredUnits,
        version: account.version + 1,
        updatedAt: now,
      });
    }
    return expiredLots;
  },
});

export const expireDueIncludedLots = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const lots = await ctx.db
      .query("aiCreditLots")
      .withIndex("by_expiry", (q) =>
        q.eq("bucket", "included").lte("expiresAt", now),
      )
      .take(100);
    let expiredLots = 0;
    for (const lot of lots) {
      if (lot.availableUnits === 0n || lot.expiresAt === undefined) continue;
      const account = await ctx.db
        .query("aiCreditAccounts")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", lot.organizationId),
        )
        .unique();
      if (!account || account.availableIncludedUnits < lot.availableUnits) {
        throw new Error(
          "AI included-credit projection requires reconciliation",
        );
      }
      const units = lot.availableUnits;
      await ctx.db.patch(lot._id, { availableUnits: 0n, updatedAt: now });
      await ctx.db.patch(account._id, {
        availableIncludedUnits: account.availableIncludedUnits - units,
        version: account.version + 1,
        updatedAt: now,
      });
      await ctx.db.insert("aiCreditLedgerEntries", {
        organizationId: lot.organizationId,
        lotId: lot._id,
        eventKind: "expire",
        bucket: "included",
        availableDeltaUnits: -units,
        reservedDeltaUnits: 0n,
        consumedDeltaUnits: 0n,
        idempotencyKey: `expire:${lot._id}:${lot.expiresAt}`,
        externalRef: lot.sourceRef,
        policyVersion: "period-expiry-v1",
        createdAt: now,
      });
      expiredLots += 1;
    }
    return expiredLots;
  },
});

export const listReconciliationCandidates = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 50, 100));
    return await ctx.db
      .query("aiCreditReservations")
      .withIndex("by_status_expiry", (q) => q.eq("status", "reconcilePending"))
      .take(limit);
  },
});

export const listHostedReconciliationCandidates = query({
  args: {
    timestamp: v.number(),
    signature: v.string(),
    limit: v.optional(v.number()),
    runId: v.optional(v.id("aiRuns")),
  },
  handler: async (ctx, args) => {
    await requireReconciliationAuthorization(
      args.timestamp,
      args.signature,
      "list",
    );
    const limit = Math.max(1, Math.min(args.limit ?? 20, 50));
    const reservations = await ctx.db
      .query("aiCreditReservations")
      .withIndex("by_status_expiry", (q) => q.eq("status", "reconcilePending"))
      .take(limit);
    return reservations
      .filter(
        (reservation) =>
          args.runId === undefined || reservation.aiRunId === args.runId,
      )
      .map((reservation) => ({
        reservationId: reservation._id,
        generationIds: reservation.generationIds,
      }));
  },
});

export const reconcileHostedReservation = mutation({
  args: {
    timestamp: v.number(),
    signature: v.string(),
    reservationId: v.id("aiCreditReservations"),
    generations: v.array(aiGatewayGenerationSummary),
  },
  handler: async (ctx, args) => {
    await requireReconciliationAuthorization(
      args.timestamp,
      args.signature,
      `settle:${args.reservationId}`,
    );
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) throw new Error("AI reservation not found");
    const receivedIds = new Set(
      args.generations.map((generation) => generation.generationId),
    );
    if (
      reservation.generationIds.length === 0 ||
      receivedIds.size !== reservation.generationIds.length ||
      reservation.generationIds.some((id) => !receivedIds.has(id))
    ) {
      throw new Error("Authoritative generation set is incomplete");
    }
    const now = Date.now();
    for (const generation of args.generations) {
      const existing = await ctx.db
        .query("aiGatewayGenerations")
        .withIndex("by_generation", (q) =>
          q.eq("generationId", generation.generationId),
        )
        .unique();
      if (!existing || existing.reservationId !== reservation._id) {
        throw new Error("Gateway generation audit row is missing");
      }
      await ctx.db.patch(existing._id, {
        resolvedModelId: generation.resolvedModelId,
        provider: generation.provider,
        status: "costed",
        totalCostUnits: generation.totalCostUnits,
        retailChargeUnits: generation.retailChargeUnits,
        inputTokens: generation.inputTokens,
        outputTokens: generation.outputTokens,
        reasoningTokens: generation.reasoningTokens,
        cachedInputTokens: generation.cachedInputTokens,
        cacheCreationTokens: generation.cacheCreationTokens,
        webSearchCalls: generation.webSearchCalls,
        latencyMs: generation.latencyMs,
        finishReason: generation.finishReason,
        reconciledAt: now,
        updatedAt: now,
      });
    }
    const actualUnits = args.generations.reduce(
      (sum, generation) => sum + generation.retailChargeUnits,
      0n,
    );
    const status = await finalizeAiReservation(ctx, {
      reservationId: reservation._id,
      actualUnits,
      generationIds: reservation.generationIds,
      now,
    });
    if (reservation.aiRunId) {
      await ctx.db.patch(reservation.aiRunId, {
        creditStatus: status,
        settledCreditUnits:
          status === "settled" || status === "released"
            ? actualUnits
            : undefined,
        updatedAt: now,
      });
    }
    return status;
  },
});

export const reconcileReservation = internalMutation({
  args: {
    reservationId: v.id("aiCreditReservations"),
    actualUnits: v.optional(v.int64()),
    generationIds: v.array(v.string()),
    releaseIfNoGeneration: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (
      args.actualUnits === undefined &&
      !(args.releaseIfNoGeneration && args.generationIds.length === 0)
    ) {
      throw new Error(
        "Reconciliation needs authoritative cost or proof of no generation",
      );
    }
    return await finalizeAiReservation(ctx, {
      reservationId: args.reservationId,
      actualUnits: args.actualUnits,
      generationIds: args.generationIds,
      now: Date.now(),
    });
  },
});
