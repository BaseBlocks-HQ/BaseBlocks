import { describe, expect, test } from "bun:test";
import {
  processWebhook,
  terminateSubscriptionForWorkspaceDeletion,
} from "./billingModel";

type RegisteredFunction = {
  _handler: (ctx: unknown, args: unknown) => Promise<unknown>;
};

describe("workspace billing deletion", () => {
  test("terminates local access immediately after provider revocation", async () => {
    const patches: Array<{ id: string; value: Record<string, unknown> }> = [];
    const subscription = {
      _id: "subscription-1",
      organizationId: "organization-1",
      providerModifiedAt: 100,
    };
    const entitlement = { _id: "entitlement-1" };
    await (
      terminateSubscriptionForWorkspaceDeletion as unknown as RegisteredFunction
    )._handler(
      {
        db: {
          get: async (id: string) =>
            id === subscription._id ? subscription : null,
          patch: async (id: string, value: Record<string, unknown>) => {
            patches.push({ id, value });
          },
          query: () => ({
            withIndex: () => ({ unique: async () => entitlement }),
          }),
        },
      },
      {
        organizationId: "organization-1",
        subscriptionId: "subscription-1",
        providerStatus: "revoked",
        providerModifiedAt: 200,
        endedAt: 300,
      },
    );

    expect(patches).toContainEqual({
      id: "subscription-1",
      value: expect.objectContaining({
        normalizedStatus: "terminated",
        providerStatus: "revoked",
        endedAt: 300,
      }),
    });
    expect(patches).toContainEqual({
      id: "entitlement-1",
      value: expect.objectContaining({
        plan: "free",
        plusEnabled: false,
        subscriptionStatus: "terminated",
      }),
    });
  });

  test("ignores late provider events after the workspace is gone", async () => {
    const patches: Array<Record<string, unknown>> = [];
    const event = {
      _id: "event-1",
      status: "pending",
      attemptCount: 0,
      organizationId: "organization-deleted",
      eventType: "subscription.updated",
      payload: { data: { id: "subscription-1" } },
    };
    await (processWebhook as unknown as RegisteredFunction)._handler(
      {
        db: {
          get: async () => event,
          patch: async (_id: string, value: Record<string, unknown>) => {
            patches.push(value);
          },
        },
        runQuery: async () => null,
      },
      { eventId: "event-1" },
    );

    expect(patches).toContainEqual(
      expect.objectContaining({
        status: "ignored",
        failureCode: "WORKSPACE_DELETED",
      }),
    );
  });

  test("ignores unsupported events before looking up workspace metadata", async () => {
    const patches: Array<Record<string, unknown>> = [];
    let organizationLookups = 0;
    const event = {
      _id: "event-unsupported",
      status: "failed",
      attemptCount: 74,
      eventType: "checkout.created",
      organizationId: "checkout-contract-probe",
      payload: { data: { id: "checkout-1" } },
    };
    await (processWebhook as unknown as RegisteredFunction)._handler(
      {
        db: {
          get: async () => event,
          patch: async (_id: string, value: Record<string, unknown>) => {
            patches.push(value);
          },
        },
        runQuery: async () => {
          organizationLookups += 1;
          throw new Error("Unsupported events must not query organizations");
        },
      },
      { eventId: "event-unsupported" },
    );

    expect(organizationLookups).toBe(0);
    expect(patches).toContainEqual(
      expect.objectContaining({
        status: "ignored",
        failureCode: "EVENT_NOT_APPLICABLE",
        attemptCount: 75,
      }),
    );
  });

  test("dead-letters a permanent failure after a bounded number of attempts", async () => {
    const patches: Array<Record<string, unknown>> = [];
    let scheduledRetries = 0;
    const event = {
      _id: "event-poison",
      status: "failed",
      attemptCount: 7,
      eventType: "subscription.updated",
      organizationId: "organization-invalid",
      payload: { data: { id: "subscription-1" } },
    };
    await (processWebhook as unknown as RegisteredFunction)._handler(
      {
        db: {
          get: async () => event,
          patch: async (_id: string, value: Record<string, unknown>) => {
            patches.push(value);
          },
        },
        runQuery: async () => {
          throw new Error("Permanent organization lookup failure");
        },
        scheduler: {
          runAfter: async () => {
            scheduledRetries += 1;
          },
        },
      },
      { eventId: "event-poison" },
    );

    expect(scheduledRetries).toBe(0);
    expect(patches).toContainEqual(
      expect.objectContaining({
        status: "deadLettered",
        attemptCount: 8,
        nextAttemptAt: undefined,
      }),
    );
  });
});
