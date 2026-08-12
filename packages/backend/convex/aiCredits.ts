import { ConvexError, v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import {
  requireOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";
import { grantAiCredits } from "./model/aiCredits";

function requirePositiveUnits(units: bigint) {
  if (units <= 0n) {
    throw new ConvexError({
      code: "INVALID_CREDIT_UNITS",
      message: "AI credit units must be positive",
    });
  }
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
    return {
      availableIncludedUnits: account?.availableIncludedUnits ?? 0n,
      availablePrepaidUnits: account?.availablePrepaidUnits ?? 0n,
    };
  },
});

/** Funding-only availability. Models and execution limits are runtime details. */
export const getSiteAvailability = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return { enabled: false, reason: "siteNotFound" as const };
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "content",
      action: "edit",
    });
    const account = await ctx.db
      .query("aiCreditAccounts")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", site.organizationId),
      )
      .unique();
    const funded =
      (account?.availableIncludedUnits ?? 0n) +
        (account?.availablePrepaidUnits ?? 0n) >
      0n;
    return {
      enabled: funded,
      reason: funded ? ("available" as const) : ("creditsRequired" as const),
    };
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
      )
        continue;
      const units = lot.availableUnits;
      await ctx.db.patch(lot._id, { availableUnits: 0n, updatedAt: now });
      await ctx.db.insert("aiCreditLedgerEntries", {
        organizationId: args.organizationId,
        lotId: lot._id,
        eventKind: "expire",
        bucket: "included",
        availableDeltaUnits: -units,
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
      if (!account) continue;
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
