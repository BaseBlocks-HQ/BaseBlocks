import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { resolveAiRunPolicy } from "./model/aiRunPolicy";

const MAX_ORGANIZATION_ID_LENGTH = 200;
const MAX_POLICY_VERSION_LENGTH = 100;

export type AiEntitlementSyncInput = {
  organizationId: string;
  enabled: boolean;
  dailyRunLimit: number;
  maxActorConcurrency: number;
  maxSiteConcurrency: number;
  maxOrganizationConcurrency: number;
  maxRequestsPerRun: number;
  maxInputTokensPerRun: number;
  maxOutputTokensPerRun: number;
  maxSpendUsdPerRun: number;
  policyVersion: string;
};

/** Validate billing/admin input before it crosses into durable admission state. */
export function validateAiEntitlementSync(input: AiEntitlementSyncInput) {
  const organizationId = input.organizationId.trim();
  const policyVersion = input.policyVersion.trim();
  if (
    organizationId.length === 0 ||
    organizationId.length > MAX_ORGANIZATION_ID_LENGTH
  ) {
    throw new Error("Invalid Editor AI entitlement organizationId");
  }
  if (
    policyVersion.length === 0 ||
    policyVersion.length > MAX_POLICY_VERSION_LENGTH
  ) {
    throw new Error("Invalid Editor AI entitlement policyVersion");
  }

  // Validate limits even for disabled rows so a later enable cannot activate a
  // previously poisoned policy. resolveAiRunPolicy owns the hard ceilings.
  resolveAiRunPolicy({ ...input, enabled: true });
  return { ...input, organizationId, policyVersion };
}

/**
 * Internal-only billing/admin synchronization boundary. There is intentionally
 * no public mutation that lets an organization enable itself.
 */
export const syncOrganizationEntitlement = internalMutation({
  args: {
    organizationId: v.string(),
    enabled: v.boolean(),
    dailyRunLimit: v.number(),
    maxActorConcurrency: v.number(),
    maxSiteConcurrency: v.number(),
    maxOrganizationConcurrency: v.number(),
    maxRequestsPerRun: v.number(),
    maxInputTokensPerRun: v.number(),
    maxOutputTokensPerRun: v.number(),
    maxSpendUsdPerRun: v.number(),
    policyVersion: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, rawInput) => {
    let input: AiEntitlementSyncInput;
    try {
      input = validateAiEntitlementSync(rawInput);
    } catch (error) {
      throw new ConvexError({
        code: "INVALID_AI_ENTITLEMENT",
        message:
          error instanceof Error
            ? error.message
            : "Invalid Editor AI entitlement",
      });
    }
    const existing = await ctx.db
      .query("aiOrganizationEntitlements")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", input.organizationId),
      )
      .unique();
    const value = { ...input, updatedAt: Date.now() };
    if (existing) await ctx.db.replace(existing._id, value);
    else await ctx.db.insert("aiOrganizationEntitlements", value);
    return null;
  },
});
