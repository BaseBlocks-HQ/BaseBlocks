import { describe, expect, test } from "bun:test";
import { validateAiEntitlementSync } from "./aiEntitlements";

const valid = {
  organizationId: "org_123",
  enabled: true,
  dailyRunLimit: 100,
  maxActorConcurrency: 1,
  maxSiteConcurrency: 2,
  maxOrganizationConcurrency: 4,
  maxRequestsPerRun: 40,
  maxInputTokensPerRun: 500_000,
  maxOutputTokensPerRun: 100_000,
  maxSpendUsdPerRun: 20,
  policyVersion: "billing-v1",
};

describe("Editor AI entitlement synchronization", () => {
  test("normalizes trusted identifiers and accepts bounded policy", () => {
    expect(
      validateAiEntitlementSync({
        ...valid,
        organizationId: "  org_123  ",
        policyVersion: " billing-v1 ",
      }),
    ).toEqual(valid);
  });

  test("rejects missing identity and policy provenance", () => {
    expect(() =>
      validateAiEntitlementSync({ ...valid, organizationId: " " }),
    ).toThrow("organizationId");
    expect(() =>
      validateAiEntitlementSync({ ...valid, policyVersion: " " }),
    ).toThrow("policyVersion");
  });

  test("rejects invalid limits even while disabled", () => {
    expect(() =>
      validateAiEntitlementSync({
        ...valid,
        enabled: false,
        dailyRunLimit: 0,
      }),
    ).toThrow("dailyRunLimit");
    expect(() =>
      validateAiEntitlementSync({
        ...valid,
        enabled: false,
        maxOrganizationConcurrency: 21,
      }),
    ).toThrow("maxOrganizationConcurrency");
    expect(() =>
      validateAiEntitlementSync({
        ...valid,
        enabled: false,
        maxRequestsPerRun: 101,
      }),
    ).toThrow("maxRequestsPerRun");
    expect(() =>
      validateAiEntitlementSync({
        ...valid,
        enabled: false,
        maxSpendUsdPerRun: Number.NaN,
      }),
    ).toThrow("maxSpendUsdPerRun");
  });
});
