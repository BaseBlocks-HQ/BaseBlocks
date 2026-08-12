import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel } from "../_generated/dataModel";

type QueryCtx = Pick<GenericQueryCtx<DataModel>, "db">;
type MutationCtx = Pick<GenericMutationCtx<DataModel>, "db">;

/**
 * Organization deletion remains Workspace-owned. This provider-neutral guard
 * prevents deleting a tenant while paid service exists. Billing orders,
 * subscriptions, webhooks, credit lots, and ledger rows are deliberately
 * retained as the financial audit trail.
 */
export async function getBillingDeletionState(
  ctx: QueryCtx,
  organizationId: string,
) {
  const subscriptions = await ctx.db
    .query("billingSubscriptions")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .collect();
  const activeSubscriptions = subscriptions.filter((subscription) =>
    ["pending", "entitled", "grace"].includes(subscription.normalizedStatus),
  );
  return {
    canDelete: activeSubscriptions.length === 0,
    activeSubscriptionIds: activeSubscriptions.map(
      (subscription) => subscription.providerSubscriptionId,
    ),
    retainedAuditFamilies: [
      "billingCustomers",
      "billingSubscriptions",
      "billingOrders",
      "billingWebhookEvents",
      "aiCreditLots",
      "aiCreditLedgerEntries",
      "storageUsageEvents",
    ] as const,
  };
}

export async function cleanupBillingDerivedData(
  ctx: MutationCtx,
  organizationId: string,
) {
  const state = await getBillingDeletionState(ctx, organizationId);
  if (!state.canDelete) {
    throw new Error("Organization billing must be terminated before deletion");
  }
  const [entitlement, storageUsage] = await Promise.all([
    ctx.db
      .query("workspaceEntitlements")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId),
      )
      .unique(),
    ctx.db
      .query("workspaceStorageUsage")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId),
      )
      .unique(),
  ]);
  if (entitlement) await ctx.db.delete(entitlement._id);
  if (storageUsage) await ctx.db.delete(storageUsage._id);
  return state;
}
