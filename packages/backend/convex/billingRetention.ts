import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import {
  cleanupBillingDerivedData,
  getBillingDeletionState,
} from "./model/billingRetention";

export const deletionState = internalQuery({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) =>
    await getBillingDeletionState(ctx, organizationId),
});

export const cleanupDerivedData = internalMutation({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) =>
    await cleanupBillingDerivedData(ctx, organizationId),
});
