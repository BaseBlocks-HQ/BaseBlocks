import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

const MAX_LOTS_PER_RESERVATION = 64;

type CreditBucket = "included" | "prepaid";

function creditError(code: string, message: string): never {
  throw new ConvexError({ code, message });
}

export function resolveBillingEnvironment(
  value: string | undefined,
): "sandbox" | "production" {
  if (value === "sandbox" || value === "production") return value;
  creditError(
    "AI_BILLING_ENVIRONMENT_MISSING",
    "AI billing environment is not configured",
  );
}

function sortLots(a: Doc<"aiCreditLots">, b: Doc<"aiCreditLots">) {
  if (a.spendPriority !== b.spendPriority) {
    return a.spendPriority - b.spendPriority;
  }
  const aExpiry = a.expiresAt ?? Number.MAX_SAFE_INTEGER;
  const bExpiry = b.expiresAt ?? Number.MAX_SAFE_INTEGER;
  if (aExpiry !== bExpiry) return aExpiry - bExpiry;
  return a.createdAt - b.createdAt || a._id.localeCompare(b._id);
}

export type CreditAllocation = {
  lotId: Id<"aiCreditLots">;
  bucket: CreditBucket;
  units: bigint;
  spendPriority: number;
};

export function allocateCreditLots(
  lots: readonly Doc<"aiCreditLots">[],
  requestedUnits: bigint,
  reservationExpiresAt: number,
): CreditAllocation[] {
  if (requestedUnits <= 0n) throw new Error("Reservation must be positive");
  let remaining = requestedUnits;
  const allocations: CreditAllocation[] = [];
  for (const lot of [...lots].sort(sortLots)) {
    if (remaining === 0n) break;
    if (lot.availableUnits <= 0n) continue;
    if (lot.expiresAt !== undefined && lot.expiresAt <= reservationExpiresAt) {
      continue;
    }
    const units =
      lot.availableUnits < remaining ? lot.availableUnits : remaining;
    allocations.push({
      lotId: lot._id,
      bucket: lot.bucket,
      units,
      spendPriority: lot.spendPriority,
    });
    remaining -= units;
  }
  if (remaining !== 0n) return [];
  return allocations;
}

export async function findActiveRateCard(
  ctx: MutationCtx,
  input: {
    providerEnvironment: "sandbox" | "production";
    modelId: string;
    now: number;
  },
) {
  const cards = await ctx.db
    .query("aiCreditRateCards")
    .withIndex("by_model_effective", (q) =>
      q
        .eq("providerEnvironment", input.providerEnvironment)
        .eq("modelId", input.modelId)
        .lte("effectiveFrom", input.now),
    )
    .order("desc")
    .take(10);
  return (
    cards.find(
      (card) =>
        card.active &&
        (card.effectiveThrough === undefined ||
          card.effectiveThrough > input.now),
    ) ?? null
  );
}

export async function reserveAiCredits(
  ctx: MutationCtx,
  input: {
    organizationId: string;
    actorId: string;
    siteId: Id<"sites">;
    requestId: string;
    promptFingerprint: string;
    feature: string;
    providerEnvironment: "sandbox" | "production";
    modelId: string;
    now: number;
    expiresAt: number;
  },
) {
  const existing = await ctx.db
    .query("aiCreditReservations")
    .withIndex("by_org_request", (q) =>
      q
        .eq("organizationId", input.organizationId)
        .eq("actorId", input.actorId)
        .eq("requestId", input.requestId),
    )
    .unique();
  if (existing) {
    if (
      existing.promptFingerprint !== input.promptFingerprint ||
      existing.siteId !== input.siteId ||
      existing.modelId !== input.modelId ||
      existing.feature !== input.feature
    ) {
      creditError(
        "AI_CREDIT_IDEMPOTENCY_CONFLICT",
        "AI request ID was already used for different work",
      );
    }
    const rateCard = await findActiveRateCard(ctx, input);
    if (!rateCard) {
      creditError("AI_RATE_CARD_MISSING", "AI credit policy is unavailable");
    }
    return { reservation: existing, rateCard, replay: true as const };
  }

  const [account, rateCard, includedLots, prepaidLots] = await Promise.all([
    ctx.db
      .query("aiCreditAccounts")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", input.organizationId),
      )
      .unique(),
    findActiveRateCard(ctx, input),
    ctx.db
      .query("aiCreditLots")
      .withIndex("by_org_bucket_expiry", (q) =>
        q.eq("organizationId", input.organizationId).eq("bucket", "included"),
      )
      .take(MAX_LOTS_PER_RESERVATION + 1),
    ctx.db
      .query("aiCreditLots")
      .withIndex("by_org_bucket_expiry", (q) =>
        q.eq("organizationId", input.organizationId).eq("bucket", "prepaid"),
      )
      .take(MAX_LOTS_PER_RESERVATION + 1),
  ]);
  if (!rateCard) {
    creditError(
      "AI_RATE_CARD_MISSING",
      "No active paid-credit policy exists for this AI model",
    );
  }
  if (account?.status !== "active") {
    creditError(
      "AI_CREDITS_UNAVAILABLE",
      "AI credits are unavailable for this workspace",
    );
  }
  if (
    includedLots.length > MAX_LOTS_PER_RESERVATION ||
    prepaidLots.length > MAX_LOTS_PER_RESERVATION
  ) {
    creditError(
      "AI_CREDIT_RECONCILIATION_REQUIRED",
      "AI credit lots require reconciliation before another request",
    );
  }
  const maximumUnits = rateCard.maxChargeUnits;
  const available =
    account.availableIncludedUnits + account.availablePrepaidUnits;
  if (maximumUnits <= 0n || available < maximumUnits) {
    creditError(
      "AI_CREDITS_INSUFFICIENT",
      "Insufficient paid AI credits for the maximum request cost",
    );
  }
  const allocations = allocateCreditLots(
    [...includedLots, ...prepaidLots],
    maximumUnits,
    input.expiresAt,
  );
  if (allocations.length === 0) {
    creditError(
      "AI_CREDITS_INSUFFICIENT",
      "Insufficient non-expiring AI credits for this request",
    );
  }
  const reservedIncludedUnits = allocations
    .filter((allocation) => allocation.bucket === "included")
    .reduce((sum, allocation) => sum + allocation.units, 0n);
  const reservedPrepaidUnits = maximumUnits - reservedIncludedUnits;
  const reservationId = await ctx.db.insert("aiCreditReservations", {
    organizationId: input.organizationId,
    actorId: input.actorId,
    siteId: input.siteId,
    requestId: input.requestId,
    promptFingerprint: input.promptFingerprint,
    feature: input.feature,
    providerEnvironment: input.providerEnvironment,
    modelId: input.modelId,
    status: "reserved",
    maximumUnits,
    reservedIncludedUnits,
    reservedPrepaidUnits,
    settledUnits: 0n,
    releasedUnits: 0n,
    generationIds: [],
    policyVersion: rateCard.policyVersion,
    expiresAt: input.expiresAt,
    createdAt: input.now,
    updatedAt: input.now,
  });
  for (const allocation of allocations) {
    const lot = await ctx.db.get(allocation.lotId);
    if (!lot || lot.availableUnits < allocation.units) {
      creditError(
        "AI_CREDIT_CONCURRENCY_CONFLICT",
        "AI credit balance changed during reservation",
      );
    }
    await ctx.db.patch(lot._id, {
      availableUnits: lot.availableUnits - allocation.units,
      reservedUnits: lot.reservedUnits + allocation.units,
      updatedAt: input.now,
    });
    await ctx.db.insert("aiCreditReservationAllocations", {
      reservationId,
      lotId: lot._id,
      bucket: allocation.bucket,
      reservedUnits: allocation.units,
      settledUnits: 0n,
      releasedUnits: 0n,
      spendPriority: allocation.spendPriority,
      createdAt: input.now,
      updatedAt: input.now,
    });
    await ctx.db.insert("aiCreditLedgerEntries", {
      organizationId: input.organizationId,
      actorId: input.actorId,
      reservationId,
      lotId: lot._id,
      eventKind: "reserve",
      bucket: allocation.bucket,
      availableDeltaUnits: -allocation.units,
      reservedDeltaUnits: allocation.units,
      consumedDeltaUnits: 0n,
      idempotencyKey: `reserve:${reservationId}:${lot._id}`,
      policyVersion: rateCard.policyVersion,
      createdAt: input.now,
    });
  }
  await ctx.db.patch(account._id, {
    availableIncludedUnits:
      account.availableIncludedUnits - reservedIncludedUnits,
    availablePrepaidUnits: account.availablePrepaidUnits - reservedPrepaidUnits,
    reservedIncludedUnits:
      account.reservedIncludedUnits + reservedIncludedUnits,
    reservedPrepaidUnits: account.reservedPrepaidUnits + reservedPrepaidUnits,
    version: account.version + 1,
    updatedAt: input.now,
  });
  const reservation = await ctx.db.get(reservationId);
  if (!reservation) throw new Error("AI reservation insert failed");
  return { reservation, rateCard, replay: false as const };
}

export async function finalizeAiReservation(
  ctx: MutationCtx,
  input: {
    reservationId: Id<"aiCreditReservations">;
    actualUnits?: bigint;
    generationIds: string[];
    failureCode?: string;
    now: number;
  },
) {
  const reservation = await ctx.db.get(input.reservationId);
  if (!reservation)
    creditError("AI_RESERVATION_NOT_FOUND", "AI reservation not found");
  if (reservation.status === "settled" || reservation.status === "released") {
    return reservation.status;
  }
  const generationIds = [...new Set(input.generationIds)].slice(0, 100);
  if (input.actualUnits === undefined && generationIds.length > 0) {
    await ctx.db.patch(reservation._id, {
      status: "reconcilePending",
      generationIds,
      failureCode: input.failureCode,
      updatedAt: input.now,
    });
    return "reconcilePending" as const;
  }
  const actualUnits = input.actualUnits ?? 0n;
  const totalReserved =
    reservation.reservedIncludedUnits + reservation.reservedPrepaidUnits;
  if (actualUnits < 0n || actualUnits > totalReserved) {
    const account = await ctx.db
      .query("aiCreditAccounts")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", reservation.organizationId),
      )
      .unique();
    if (account) {
      await ctx.db.patch(account._id, {
        status: "blockedReconciliation",
        version: account.version + 1,
        updatedAt: input.now,
      });
    }
    await ctx.db.patch(reservation._id, {
      status: "reconcilePending",
      generationIds,
      failureCode: "COST_EXCEEDS_RESERVATION",
      updatedAt: input.now,
    });
    return "reconcilePending" as const;
  }
  const [account, allocations] = await Promise.all([
    ctx.db
      .query("aiCreditAccounts")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", reservation.organizationId),
      )
      .unique(),
    ctx.db
      .query("aiCreditReservationAllocations")
      .withIndex("by_reservation", (q) =>
        q.eq("reservationId", reservation._id),
      )
      .collect(),
  ]);
  if (!account)
    creditError("AI_ACCOUNT_NOT_FOUND", "AI credit account not found");
  allocations.sort(
    (a, b) =>
      a.spendPriority - b.spendPriority ||
      a.createdAt - b.createdAt ||
      a._id.localeCompare(b._id),
  );
  let remainingCharge = actualUnits;
  let releasedIncluded = 0n;
  let releasedPrepaid = 0n;
  for (const allocation of allocations) {
    const charge =
      allocation.reservedUnits < remainingCharge
        ? allocation.reservedUnits
        : remainingCharge;
    const release = allocation.reservedUnits - charge;
    remainingCharge -= charge;
    const lot = await ctx.db.get(allocation.lotId);
    if (!lot || lot.reservedUnits < allocation.reservedUnits) {
      creditError(
        "AI_CREDIT_RECONCILIATION_REQUIRED",
        "AI credit allocation no longer matches its lot",
      );
    }
    await ctx.db.patch(lot._id, {
      availableUnits: lot.availableUnits + release,
      reservedUnits: lot.reservedUnits - allocation.reservedUnits,
      updatedAt: input.now,
    });
    await ctx.db.patch(allocation._id, {
      settledUnits: charge,
      releasedUnits: release,
      updatedAt: input.now,
    });
    if (charge > 0n) {
      await ctx.db.insert("aiCreditLedgerEntries", {
        organizationId: reservation.organizationId,
        actorId: reservation.actorId,
        runId: reservation.aiRunId,
        reservationId: reservation._id,
        lotId: lot._id,
        eventKind: "settle",
        bucket: allocation.bucket,
        availableDeltaUnits: 0n,
        reservedDeltaUnits: -charge,
        consumedDeltaUnits: charge,
        idempotencyKey: `settle:${reservation._id}:${lot._id}`,
        policyVersion: reservation.policyVersion,
        createdAt: input.now,
      });
    }
    if (release > 0n) {
      await ctx.db.insert("aiCreditLedgerEntries", {
        organizationId: reservation.organizationId,
        actorId: reservation.actorId,
        runId: reservation.aiRunId,
        reservationId: reservation._id,
        lotId: lot._id,
        eventKind: "release",
        bucket: allocation.bucket,
        availableDeltaUnits: release,
        reservedDeltaUnits: -release,
        consumedDeltaUnits: 0n,
        idempotencyKey: `release:${reservation._id}:${lot._id}`,
        policyVersion: reservation.policyVersion,
        createdAt: input.now,
      });
    }
    if (allocation.bucket === "included") releasedIncluded += release;
    else releasedPrepaid += release;
  }
  await ctx.db.patch(account._id, {
    availableIncludedUnits: account.availableIncludedUnits + releasedIncluded,
    availablePrepaidUnits: account.availablePrepaidUnits + releasedPrepaid,
    reservedIncludedUnits:
      account.reservedIncludedUnits - reservation.reservedIncludedUnits,
    reservedPrepaidUnits:
      account.reservedPrepaidUnits - reservation.reservedPrepaidUnits,
    lifetimeConsumedUnits: account.lifetimeConsumedUnits + actualUnits,
    version: account.version + 1,
    updatedAt: input.now,
  });
  const releasedUnits = totalReserved - actualUnits;
  const status = actualUnits === 0n ? "released" : "settled";
  await ctx.db.patch(reservation._id, {
    status,
    settledUnits: actualUnits,
    releasedUnits,
    generationIds,
    failureCode: input.failureCode,
    settledAt: actualUnits > 0n ? input.now : undefined,
    releasedAt: releasedUnits > 0n ? input.now : undefined,
    updatedAt: input.now,
  });
  return status;
}

export async function grantAiCredits(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    bucket: "included" | "prepaid";
    sourceKind: "recurring" | "purchase" | "adjustment" | "refund";
    sourceRef: string;
    units: bigint;
    periodStart?: number;
    periodEnd?: number;
    expiresAt?: number;
    policyVersion: string;
    billingEventId?: Id<"billingWebhookEvents">;
    now: number;
  },
) {
  if (args.units <= 0n) throw new Error("AI credit grant must be positive");
  if (args.bucket === "included" && args.expiresAt === undefined) {
    throw new Error("Included AI credits require an expiration");
  }
  const existing = await ctx.db
    .query("aiCreditLots")
    .withIndex("by_source_ref", (q) =>
      q
        .eq("organizationId", args.organizationId)
        .eq("sourceRef", args.sourceRef),
    )
    .unique();
  if (existing) return existing._id;
  let account = await ctx.db
    .query("aiCreditAccounts")
    .withIndex("by_organization", (q) =>
      q.eq("organizationId", args.organizationId),
    )
    .unique();
  if (!account) {
    const accountId = await ctx.db.insert("aiCreditAccounts", {
      organizationId: args.organizationId,
      availableIncludedUnits: 0n,
      availablePrepaidUnits: 0n,
      reservedIncludedUnits: 0n,
      reservedPrepaidUnits: 0n,
      lifetimeGrantedUnits: 0n,
      lifetimeConsumedUnits: 0n,
      status: "active",
      version: 1,
      createdAt: args.now,
      updatedAt: args.now,
    });
    account = await ctx.db.get(accountId);
  }
  if (account?.status !== "active") {
    creditError(
      "AI_CREDIT_RECONCILIATION_REQUIRED",
      "AI credit account is blocked pending reconciliation",
    );
  }
  const lotId = await ctx.db.insert("aiCreditLots", {
    organizationId: args.organizationId,
    bucket: args.bucket,
    sourceKind: args.sourceKind,
    sourceRef: args.sourceRef,
    grantedUnits: args.units,
    availableUnits: args.units,
    reservedUnits: 0n,
    revokedUnits: 0n,
    periodStart: args.periodStart,
    periodEnd: args.periodEnd,
    expiresAt: args.expiresAt,
    spendPriority: args.bucket === "included" ? 0 : 1,
    createdAt: args.now,
    updatedAt: args.now,
  });
  await ctx.db.patch(account._id, {
    availableIncludedUnits:
      account.availableIncludedUnits +
      (args.bucket === "included" ? args.units : 0n),
    availablePrepaidUnits:
      account.availablePrepaidUnits +
      (args.bucket === "prepaid" ? args.units : 0n),
    lifetimeGrantedUnits: account.lifetimeGrantedUnits + args.units,
    version: account.version + 1,
    updatedAt: args.now,
  });
  await ctx.db.insert("aiCreditLedgerEntries", {
    organizationId: args.organizationId,
    lotId,
    billingEventId: args.billingEventId,
    eventKind: "grant",
    bucket: args.bucket,
    availableDeltaUnits: args.units,
    reservedDeltaUnits: 0n,
    consumedDeltaUnits: 0n,
    idempotencyKey: `grant:${args.sourceRef}`,
    externalRef: args.sourceRef,
    policyVersion: args.policyVersion,
    createdAt: args.now,
  });
  return lotId;
}

/**
 * Repairs an idempotent purchase grant when an authoritative provider event
 * reveals a larger gross payment than an earlier event recorded. Purchased
 * credits can only move upward here; refunds use the dedicated revocation path.
 */
export async function reconcileAiCreditGrantUpward(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    bucket: "included" | "prepaid";
    sourceRef: string;
    units: bigint;
    policyVersion: string;
    billingEventId?: Id<"billingWebhookEvents">;
    now: number;
  },
) {
  const lot = await ctx.db
    .query("aiCreditLots")
    .withIndex("by_source_ref", (q) =>
      q
        .eq("organizationId", args.organizationId)
        .eq("sourceRef", args.sourceRef),
    )
    .unique();
  if (!lot || args.units <= lot.grantedUnits) return 0n;

  const account = await ctx.db
    .query("aiCreditAccounts")
    .withIndex("by_organization", (q) =>
      q.eq("organizationId", args.organizationId),
    )
    .unique();
  if (account?.status !== "active") {
    creditError(
      "AI_CREDIT_RECONCILIATION_REQUIRED",
      "AI credit account is unavailable for purchase reconciliation",
    );
  }

  const delta = args.units - lot.grantedUnits;
  await ctx.db.patch(lot._id, {
    grantedUnits: args.units,
    availableUnits: lot.availableUnits + delta,
    updatedAt: args.now,
  });
  await ctx.db.patch(account._id, {
    availableIncludedUnits:
      account.availableIncludedUnits +
      (args.bucket === "included" ? delta : 0n),
    availablePrepaidUnits:
      account.availablePrepaidUnits + (args.bucket === "prepaid" ? delta : 0n),
    lifetimeGrantedUnits: account.lifetimeGrantedUnits + delta,
    version: account.version + 1,
    updatedAt: args.now,
  });
  await ctx.db.insert("aiCreditLedgerEntries", {
    organizationId: args.organizationId,
    lotId: lot._id,
    billingEventId: args.billingEventId,
    eventKind: "reconcile",
    bucket: args.bucket,
    availableDeltaUnits: delta,
    reservedDeltaUnits: 0n,
    consumedDeltaUnits: 0n,
    idempotencyKey: `reconcile:${args.sourceRef}:${args.units}`,
    externalRef: args.sourceRef,
    policyVersion: args.policyVersion,
    createdAt: args.now,
  });
  return delta;
}

export function selectIncludedCreditLotsForReplacement(
  lots: readonly Doc<"aiCreditLots">[],
  options: { excludeSourceRef?: string } = {},
) {
  return lots
    .filter(
      (lot) =>
        lot.bucket === "included" &&
        lot.sourceKind === "recurring" &&
        lot.sourceRef !== options.excludeSourceRef &&
        lot.availableUnits > 0n,
    )
    .map((lot) => ({ lotId: lot._id, units: lot.availableUnits }));
}

/**
 * Replace unused recurring credits when a paid subscription changes.
 * Reserved units remain available to their existing reservations; purchased
 * prepaid lots are intentionally excluded from this adjustment.
 */
export async function replaceUnusedIncludedCreditLots(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    replacementRef: string;
    preserveSourceRef: string;
    policyVersion: string;
    billingEventId?: Id<"billingWebhookEvents">;
    now: number;
  },
) {
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
      .take(MAX_LOTS_PER_RESERVATION + 1),
  ]);
  if (lots.length > MAX_LOTS_PER_RESERVATION) {
    throw new Error(
      "AI credit lots require reconciliation before a plan change",
    );
  }
  const replacements = selectIncludedCreditLotsForReplacement(lots, {
    excludeSourceRef: args.preserveSourceRef,
  });
  const totalUnits = replacements.reduce((sum, item) => sum + item.units, 0n);
  if (totalUnits === 0n) return 0n;
  if (!account || account.availableIncludedUnits < totalUnits) {
    throw new Error(
      "AI credit account requires reconciliation before replacement",
    );
  }

  for (const replacement of replacements) {
    const lot = lots.find((candidate) => candidate._id === replacement.lotId);
    if (!lot) throw new Error("AI credit lot disappeared during replacement");
    await ctx.db.patch(lot._id, {
      availableUnits: lot.availableUnits - replacement.units,
      revokedUnits: lot.revokedUnits + replacement.units,
      updatedAt: args.now,
    });
    await ctx.db.insert("aiCreditLedgerEntries", {
      organizationId: args.organizationId,
      lotId: lot._id,
      billingEventId: args.billingEventId,
      eventKind: "adjust",
      bucket: "included",
      availableDeltaUnits: -replacement.units,
      reservedDeltaUnits: 0n,
      consumedDeltaUnits: 0n,
      idempotencyKey: `replace-included:${args.replacementRef}:${lot._id}`,
      externalRef: `included-replacement:${args.replacementRef}`,
      policyVersion: args.policyVersion,
      createdAt: args.now,
    });
  }
  await ctx.db.patch(account._id, {
    availableIncludedUnits: account.availableIncludedUnits - totalUnits,
    version: account.version + 1,
    updatedAt: args.now,
  });
  return totalUnits;
}

export async function revokeAiCreditGrant(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    sourceRef: string;
    targetRevokedUnits: bigint;
    policyVersion: string;
    billingEventId?: Id<"billingWebhookEvents">;
    now: number;
  },
) {
  if (args.targetRevokedUnits < 0n) throw new Error("Invalid revoked units");
  const [lot, account] = await Promise.all([
    ctx.db
      .query("aiCreditLots")
      .withIndex("by_source_ref", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("sourceRef", args.sourceRef),
      )
      .unique(),
    ctx.db
      .query("aiCreditAccounts")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .unique(),
  ]);
  if (!lot || !account) return null;
  if (args.targetRevokedUnits <= lot.revokedUnits) return lot._id;
  if (args.targetRevokedUnits > lot.grantedUnits) {
    throw new Error("Refund revocation exceeds the original credit grant");
  }
  const delta = args.targetRevokedUnits - lot.revokedUnits;
  const removable = lot.availableUnits < delta ? lot.availableUnits : delta;
  const requiresReconciliation = removable < delta;
  await ctx.db.patch(lot._id, {
    availableUnits: lot.availableUnits - removable,
    revokedUnits: args.targetRevokedUnits,
    updatedAt: args.now,
  });
  await ctx.db.patch(account._id, {
    availableIncludedUnits:
      account.availableIncludedUnits -
      (lot.bucket === "included" ? removable : 0n),
    availablePrepaidUnits:
      account.availablePrepaidUnits -
      (lot.bucket === "prepaid" ? removable : 0n),
    status: requiresReconciliation ? "blockedReconciliation" : account.status,
    version: account.version + 1,
    updatedAt: args.now,
  });
  await ctx.db.insert("aiCreditLedgerEntries", {
    organizationId: args.organizationId,
    lotId: lot._id,
    billingEventId: args.billingEventId,
    eventKind: "refund",
    bucket: lot.bucket,
    availableDeltaUnits: -removable,
    reservedDeltaUnits: 0n,
    consumedDeltaUnits: 0n,
    idempotencyKey: `refund:${args.sourceRef}:${args.targetRevokedUnits}`,
    externalRef: args.sourceRef,
    policyVersion: args.policyVersion,
    createdAt: args.now,
  });
  return lot._id;
}
