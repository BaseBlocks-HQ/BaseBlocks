import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

const BATCH_SIZE = 100;

type WorkspaceEntitlementValue = Omit<
  Doc<"workspaceEntitlements">,
  "_id" | "_creationTime"
>;
type BillingSnapshotValue = Omit<
  Doc<"billingSeatSnapshots">,
  "_id" | "_creationTime"
>;
type SeatSyncOperationValue = Omit<
  Doc<"billingSeatSyncOperations">,
  "_id" | "_creationTime"
>;

type LegacyWorkspaceEntitlement = WorkspaceEntitlementValue & {
  paidSeatCapacity?: number;
  billableSeatCount?: number;
};

type LegacyBillingSnapshot = Omit<
  BillingSnapshotValue,
  "workspaceMemberCount" | "seatQuantity"
> &
  Partial<
    Pick<BillingSnapshotValue, "workspaceMemberCount" | "seatQuantity">
  > & {
    billableSeatCount?: number;
  };

type LegacySeatSyncOperation = Omit<
  SeatSyncOperationValue,
  "previousSeatQuantity" | "targetSeatQuantity"
> &
  Partial<
    Pick<SeatSyncOperationValue, "previousSeatQuantity" | "targetSeatQuantity">
  > & {
    previousSeats?: number;
    targetSeats?: number;
  };

export function migrateWorkspaceEntitlementDocument(
  document: LegacyWorkspaceEntitlement,
): WorkspaceEntitlementValue {
  return {
    organizationId: document.organizationId,
    plan: document.plan,
    subscriptionStatus: document.subscriptionStatus,
    statusReason: document.statusReason,
    plusEnabled: document.plusEnabled,
    sourceSubscriptionId: document.sourceSubscriptionId,
    sourceEventId: document.sourceEventId,
    effectiveFrom: document.effectiveFrom,
    effectiveThrough: document.effectiveThrough,
    policyVersion: document.policyVersion,
    derivedAt: document.derivedAt,
    updatedAt: document.updatedAt,
  };
}

export function migrateBillingSnapshotDocument(
  document: LegacyBillingSnapshot,
): BillingSnapshotValue {
  const memberIds = [...new Set(document.memberIds)].sort();
  const workspaceMemberCount = memberIds.length;
  const seatQuantity =
    document.seatQuantity ?? Math.max(1, workspaceMemberCount);
  return {
    organizationId: document.organizationId,
    subscriptionId: document.subscriptionId,
    membershipRevision: document.membershipRevision,
    memberIds,
    workspaceMemberCount,
    seatQuantity,
    source: document.source,
    observedAt: document.observedAt,
  };
}

export function migrateSeatSyncOperationDocument(
  document: LegacySeatSyncOperation,
): SeatSyncOperationValue {
  const previousSeatQuantity =
    document.previousSeatQuantity ?? document.previousSeats;
  const targetSeatQuantity =
    document.targetSeatQuantity ?? document.targetSeats;
  if (previousSeatQuantity === undefined || targetSeatQuantity === undefined) {
    throw new Error("Seat sync operation has no seat quantities");
  }
  return {
    organizationId: document.organizationId,
    subscriptionId: document.subscriptionId,
    membershipRevision: document.membershipRevision,
    previousSeatQuantity,
    targetSeatQuantity,
    idempotencyKey: document.idempotencyKey,
    status: document.status,
    attemptCount: document.attemptCount,
    leaseExpiresAt: document.leaseExpiresAt,
    nextAttemptAt: document.nextAttemptAt,
    failureCode: document.failureCode,
    providerModifiedAt: document.providerModifiedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

const migrationTable = v.union(
  v.literal("workspaceEntitlements"),
  v.literal("billingSeatSnapshots"),
  v.literal("billingSeatSyncOperations"),
);

export const migrateBatch = internalMutation({
  args: {
    table: migrationTable,
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = Math.max(1, Math.min(args.batchSize ?? BATCH_SIZE, 100));
    const cursor = args.cursor ?? null;

    if (args.table === "workspaceEntitlements") {
      const page = await ctx.db
        .query("workspaceEntitlements")
        .paginate({ numItems: batchSize, cursor });
      for (const document of page.page) {
        await ctx.db.replace(
          document._id,
          migrateWorkspaceEntitlementDocument(
            document as LegacyWorkspaceEntitlement,
          ),
        );
      }
      return {
        table: args.table,
        processed: page.page.length,
        isDone: page.isDone,
        nextCursor: page.isDone ? null : page.continueCursor,
      };
    }

    if (args.table === "billingSeatSnapshots") {
      const page = await ctx.db
        .query("billingSeatSnapshots")
        .paginate({ numItems: batchSize, cursor });
      for (const document of page.page) {
        await ctx.db.replace(
          document._id,
          migrateBillingSnapshotDocument(document as LegacyBillingSnapshot),
        );
      }
      return {
        table: args.table,
        processed: page.page.length,
        isDone: page.isDone,
        nextCursor: page.isDone ? null : page.continueCursor,
      };
    }

    const page = await ctx.db
      .query("billingSeatSyncOperations")
      .paginate({ numItems: batchSize, cursor });
    for (const document of page.page) {
      await ctx.db.replace(
        document._id,
        migrateSeatSyncOperationDocument(document as LegacySeatSyncOperation),
      );
    }
    return {
      table: args.table,
      processed: page.page.length,
      isDone: page.isDone,
      nextCursor: page.isDone ? null : page.continueCursor,
    };
  },
});
