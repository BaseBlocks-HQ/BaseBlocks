export const subscriptionStates = [
  "none",
  "pending",
  "entitled",
  "grace",
  "suspended",
  "terminated",
  "unknown",
] as const;

export type SubscriptionState = (typeof subscriptionStates)[number];

export interface WorkspaceBillingEntitlement {
  plan: "free" | "plus";
  subscriptionState: SubscriptionState;
  workspaceMemberCount: number;
  plusEnabled: boolean;
  aiAdmissionAvailable: boolean;
  availableAiCreditUnits: bigint;
  effectiveThrough?: number;
}

export type BillingCallout =
  | "none"
  | "pending"
  | "grace"
  | "suspended"
  | "terminated"
  | "unknown";

export function getBillingCallout(
  entitlement: WorkspaceBillingEntitlement,
): BillingCallout {
  if (
    entitlement.subscriptionState === "none" ||
    entitlement.subscriptionState === "entitled"
  ) {
    return "none";
  }
  return entitlement.subscriptionState;
}

export function canUsePaidFeatures(
  entitlement: WorkspaceBillingEntitlement,
): boolean {
  return entitlement.plan === "plus" && entitlement.plusEnabled;
}

export function canRequestAi(
  entitlement: WorkspaceBillingEntitlement,
): boolean {
  return entitlement.aiAdmissionAvailable;
}
