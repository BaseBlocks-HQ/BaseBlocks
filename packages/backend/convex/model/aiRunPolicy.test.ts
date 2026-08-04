import { describe, expect, test } from "bun:test";
import {
  assertActiveAiRunLease,
  assertAiRunCapacity,
  assertAiRunTransition,
  resolveAiRunPolicy,
} from "./aiRunPolicy";

const entitlement = {
  enabled: true,
  dailyRunLimit: 100,
  maxActorConcurrency: 1,
  maxSiteConcurrency: 2,
  maxOrganizationConcurrency: 4,
  maxRequestsPerRun: 40,
  maxInputTokensPerRun: 200_000,
  maxOutputTokensPerRun: 50_000,
  maxSpendUsdPerRun: 5,
};

describe("AI run admission policy", () => {
  test("fails closed without a billing entitlement", () => {
    expect(() => resolveAiRunPolicy(undefined)).toThrow("not enabled");
    expect(() =>
      resolveAiRunPolicy({ ...entitlement, enabled: false }),
    ).toThrow("not enabled");
  });

  test("rejects malformed or excessive injected limits", () => {
    expect(() =>
      resolveAiRunPolicy({ ...entitlement, dailyRunLimit: Number.NaN }),
    ).toThrow("dailyRunLimit");
    expect(() =>
      resolveAiRunPolicy({ ...entitlement, maxSiteConcurrency: 21 }),
    ).toThrow("maxSiteConcurrency");
  });

  test("enforces actor, site, organization, and daily capacity", () => {
    const policy = resolveAiRunPolicy(entitlement);
    expect(() =>
      assertAiRunCapacity({
        policy,
        actorActive: 1,
        siteActive: 0,
        organizationActive: 0,
        recentRuns: 0,
      }),
    ).toThrow("Actor");
    expect(() =>
      assertAiRunCapacity({
        policy,
        actorActive: 0,
        siteActive: 0,
        organizationActive: 0,
        recentRuns: 100,
      }),
    ).toThrow("daily quota");
  });

  test("permits writes and terminal transitions only with a live running lease", () => {
    const now = 10_000;
    const active = { status: "running" as const, leaseExpiresAt: now + 1 };
    expect(() => assertActiveAiRunLease(active, now)).not.toThrow();
    expect(() => assertAiRunTransition(active, "completed", now)).not.toThrow();
    expect(() => assertAiRunTransition(active, "failed", now)).not.toThrow();

    expect(() =>
      assertActiveAiRunLease({ status: "running", leaseExpiresAt: now }, now),
    ).toThrow("expired");
    expect(() =>
      assertAiRunTransition(
        { status: "completed", leaseExpiresAt: now + 1 },
        "failed",
        now,
      ),
    ).toThrow("already completed");
    expect(() =>
      assertAiRunTransition(
        { status: "failed", leaseExpiresAt: now + 1 },
        "completed",
        now,
      ),
    ).toThrow("already failed");
  });
});
