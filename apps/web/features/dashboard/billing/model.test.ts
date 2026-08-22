import { describe, expect, test } from "bun:test";
import {
  canRequestAi,
  canUsePaidFeatures,
  getBillingCallout,
  type WorkspaceBillingEntitlement,
} from "./model";

const plusEntitlement: WorkspaceBillingEntitlement = {
  plan: "plus",
  subscriptionState: "entitled",
  workspaceMemberCount: 3,
  plusEnabled: true,
  aiAdmissionAvailable: true,
  availableAiCreditUnits: 500_000n,
};

describe("billing presentation model", () => {
  test("only treats an enabled Plus entitlement as paid access", () => {
    expect(canUsePaidFeatures(plusEntitlement)).toBe(true);
    expect(canUsePaidFeatures({ ...plusEntitlement, plusEnabled: false })).toBe(
      false,
    );
    expect(
      canUsePaidFeatures({
        ...plusEntitlement,
        plan: "free",
        plusEnabled: true,
      }),
    ).toBe(false);
  });

  test("allows AI whenever the workspace has spendable credits", () => {
    expect(canRequestAi(plusEntitlement)).toBe(true);
    expect(
      canRequestAi({
        ...plusEntitlement,
        plan: "free",
        plusEnabled: false,
      }),
    ).toBe(true);
    expect(
      canRequestAi({ ...plusEntitlement, aiAdmissionAvailable: false }),
    ).toBe(false);
  });

  test("uses the accepted workspace-member count as the only member value", () => {
    const freeEntitlement: WorkspaceBillingEntitlement = {
      ...plusEntitlement,
      plan: "free",
      subscriptionState: "none",
      workspaceMemberCount: 8,
      plusEnabled: false,
      aiAdmissionAvailable: false,
      availableAiCreditUnits: 0n,
    };

    expect(freeEntitlement.workspaceMemberCount).toBe(8);
  });

  test("maps non-entitled states to an actionable callout", () => {
    expect(
      getBillingCallout({ ...plusEntitlement, subscriptionState: "none" }),
    ).toBe("none");
    expect(getBillingCallout(plusEntitlement)).toBe("none");
    expect(
      getBillingCallout({ ...plusEntitlement, subscriptionState: "grace" }),
    ).toBe("grace");
    expect(
      getBillingCallout({ ...plusEntitlement, subscriptionState: "unknown" }),
    ).toBe("unknown");
  });
});
