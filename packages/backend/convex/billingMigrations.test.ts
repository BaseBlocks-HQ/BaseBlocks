import { describe, expect, test } from "bun:test";
import {
  migrateBillingSnapshotDocument,
  migrateSeatSyncOperationDocument,
  migrateWorkspaceEntitlementDocument,
} from "./billingMigrations";

describe("billing domain migration", () => {
  test("removes legacy entitlement seat fields", () => {
    const migrated = migrateWorkspaceEntitlementDocument({
      organizationId: "org-1",
      plan: "plus",
      subscriptionStatus: "entitled",
      statusReason: "polar:active",
      plusEnabled: true,
      paidSeatCapacity: 8,
      billableSeatCount: 8,
      effectiveFrom: 1,
      policyVersion: "polar-entitlements-v1",
      derivedAt: 1,
      updatedAt: 1,
    });

    expect(migrated).toEqual({
      organizationId: "org-1",
      plan: "plus",
      subscriptionStatus: "entitled",
      statusReason: "polar:active",
      plusEnabled: true,
      effectiveFrom: 1,
      policyVersion: "polar-entitlements-v1",
      derivedAt: 1,
      updatedAt: 1,
    });
  });

  test("separates workspace membership from the provider seat quantity", () => {
    const migrated = migrateBillingSnapshotDocument({
      organizationId: "org-1",
      membershipRevision: '["m1","m2"]',
      memberIds: ["m2", "m1"],
      billableSeatCount: 2,
      source: "checkout",
      observedAt: 1,
    });

    expect(migrated.workspaceMemberCount).toBe(2);
    expect(migrated.seatQuantity).toBe(2);
    expect(migrated.memberIds).toEqual(["m1", "m2"]);
    expect(migrated).not.toHaveProperty("billableSeatCount");
  });

  test("normalizes duplicate legacy members before deriving quantities", () => {
    const migrated = migrateBillingSnapshotDocument({
      organizationId: "org-1",
      membershipRevision: '["m1","m2"]',
      memberIds: ["m2", "m1", "m2"],
      billableSeatCount: 3,
      source: "checkout",
      observedAt: 1,
    });

    expect(migrated.memberIds).toEqual(["m1", "m2"]);
    expect(migrated.workspaceMemberCount).toBe(2);
    expect(migrated.seatQuantity).toBe(2);
  });

  test("renames seat sync quantities without changing the operation", () => {
    const migrated = migrateSeatSyncOperationDocument({
      organizationId: "org-1",
      subscriptionId: "subscription-1" as never,
      membershipRevision: "revision-1",
      previousSeats: 2,
      targetSeats: 3,
      idempotencyKey: "seat:subscription-1:revision-1",
      status: "pending",
      attemptCount: 0,
      createdAt: 1,
      updatedAt: 1,
    });

    expect(migrated.previousSeatQuantity).toBe(2);
    expect(migrated.targetSeatQuantity).toBe(3);
    expect(migrated).not.toHaveProperty("previousSeats");
    expect(migrated).not.toHaveProperty("targetSeats");
  });
});
