import { describe, expect, test } from "bun:test";
import {
  canRequestAi,
  canUsePaidFeatures,
  getAdditionalSeatCount,
  getBillingCallout,
  type WorkspaceBillingEntitlement,
} from "./model";

const plusEntitlement: WorkspaceBillingEntitlement = {
  plan: "plus",
  subscriptionState: "entitled",
  billableSeatCount: 3,
  paidSeatCapacity: 3,
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

  test("reports seats beyond paid capacity without negative counts", () => {
    expect(getAdditionalSeatCount(plusEntitlement)).toBe(0);
    expect(
      getAdditionalSeatCount({
        ...plusEntitlement,
        billableSeatCount: 5,
        paidSeatCapacity: 3,
      }),
    ).toBe(2);
    expect(
      getAdditionalSeatCount({
        ...plusEntitlement,
        billableSeatCount: 1,
        paidSeatCapacity: 3,
      }),
    ).toBe(0);
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
