import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

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

/**
 * Debit provider-authoritative usage after a Gateway generation completes.
 * generationId is the accounting idempotency boundary: workflow retries can
 * never consume twice. This deliberately has no guessed task reservation.
 */
export async function consumeAiCredits(
  ctx: MutationCtx,
  input: {
    organizationId: string;
    actorId: string;
    runId: Id<"siteAssistantRuns">;
    generationId: string;
    units: bigint;
    now: number;
  },
) {
  if (input.units < 0n) throw new Error("AI usage cannot be negative");
  const idempotencyKey = `generation:${input.generationId}`;
  const existing = await ctx.db
    .query("aiCreditLedgerEntries")
    .withIndex("by_org_idempotency", (q) =>
      q
        .eq("organizationId", input.organizationId)
        .eq("idempotencyKey", idempotencyKey),
    )
    .unique();
  if (existing) return { replayed: true as const };
  const [account, included, prepaid] = await Promise.all([
    ctx.db
      .query("aiCreditAccounts")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", input.organizationId),
      )
      .unique(),
    ctx.db
      .query("aiCreditLots")
      .withIndex("by_org_bucket_expiry", (q) =>
        q.eq("organizationId", input.organizationId).eq("bucket", "included"),
      )
      .collect(),
    ctx.db
      .query("aiCreditLots")
      .withIndex("by_org_bucket_expiry", (q) =>
        q.eq("organizationId", input.organizationId).eq("bucket", "prepaid"),
      )
      .collect(),
  ]);
  if (!account)
    creditError("AI_ACCOUNT_NOT_FOUND", "AI credit account not found");
  let remaining = input.units;
  let includedDebit = 0n;
  let prepaidDebit = 0n;
  for (const lot of [...included, ...prepaid].sort(sortLots)) {
    if (lot.expiresAt !== undefined && lot.expiresAt <= input.now) {
      if (lot.availableUnits > 0n) {
        const expired = lot.availableUnits;
        if (lot.bucket === "included") includedDebit += expired;
        else prepaidDebit += expired;
        await ctx.db.patch(lot._id, {
          availableUnits: 0n,
          updatedAt: input.now,
        });
        await ctx.db.insert("aiCreditLedgerEntries", {
          organizationId: input.organizationId,
          lotId: lot._id,
          eventKind: "expire",
          bucket: lot.bucket,
          availableDeltaUnits: -expired,
          consumedDeltaUnits: 0n,
          idempotencyKey: `expire:${lot._id}`,
          policyVersion: "gateway-actual-cost-v1",
          createdAt: input.now,
        });
      }
      continue;
    }
    if (remaining === 0n) break;
    if (lot.availableUnits <= 0n) continue;
    const debit =
      lot.availableUnits < remaining ? lot.availableUnits : remaining;
    remaining -= debit;
    if (lot.bucket === "included") includedDebit += debit;
    else prepaidDebit += debit;
    await ctx.db.patch(lot._id, {
      availableUnits: lot.availableUnits - debit,
      updatedAt: input.now,
    });
    await ctx.db.insert("aiCreditLedgerEntries", {
      organizationId: input.organizationId,
      actorId: input.actorId,
      runId: input.runId,
      lotId: lot._id,
      eventKind: "consume",
      bucket: lot.bucket,
      availableDeltaUnits: -debit,
      consumedDeltaUnits: debit,
      idempotencyKey:
        remaining === 0n ? idempotencyKey : `${idempotencyKey}:${lot._id}`,
      externalRef: input.generationId,
      policyVersion: "gateway-actual-cost-v1",
      createdAt: input.now,
    });
  }
  // A provider charge can race the last available credit. Keep the exact debt
  // visible and block new turns instead of dropping already-incurred usage.
  if (remaining > 0n) {
    prepaidDebit += remaining;
    await ctx.db.insert("aiCreditLedgerEntries", {
      organizationId: input.organizationId,
      actorId: input.actorId,
      runId: input.runId,
      eventKind: "consume",
      bucket: "prepaid",
      availableDeltaUnits: -remaining,
      consumedDeltaUnits: remaining,
      idempotencyKey,
      externalRef: input.generationId,
      policyVersion: "gateway-actual-cost-v1",
      createdAt: input.now,
    });
  }
  await ctx.db.patch(account._id, {
    availableIncludedUnits: account.availableIncludedUnits - includedDebit,
    availablePrepaidUnits: account.availablePrepaidUnits - prepaidDebit,
    lifetimeConsumedUnits: account.lifetimeConsumedUnits + input.units,
    version: account.version + 1,
    updatedAt: input.now,
  });
  return { replayed: false as const };
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
      lifetimeGrantedUnits: 0n,
      lifetimeConsumedUnits: 0n,
      version: 1,
      createdAt: args.now,
      updatedAt: args.now,
    });
    account = await ctx.db.get(accountId);
  }
  if (!account) throw new Error("AI credit account creation failed");
  const lotId = await ctx.db.insert("aiCreditLots", {
    organizationId: args.organizationId,
    bucket: args.bucket,
    sourceKind: args.sourceKind,
    sourceRef: args.sourceRef,
    grantedUnits: args.units,
    availableUnits: args.units,
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
  if (!account) return 0n;

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
 * Purchased prepaid lots are intentionally excluded from this adjustment.
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
      .collect(),
  ]);
  const replacements = selectIncludedCreditLotsForReplacement(lots, {
    excludeSourceRef: args.preserveSourceRef,
  });
  const totalUnits = replacements.reduce((sum, item) => sum + item.units, 0n);
  if (totalUnits === 0n) return 0n;
  if (!account) return 0n;

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
    consumedDeltaUnits: 0n,
    idempotencyKey: `refund:${args.sourceRef}:${args.targetRevokedUnits}`,
    externalRef: args.sourceRef,
    policyVersion: args.policyVersion,
    createdAt: args.now,
  });
  return lot._id;
}
