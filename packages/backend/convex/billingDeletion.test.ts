import { describe, expect, test } from "bun:test";
import { terminateSubscriptionForWorkspaceDeletion } from "./billingModel";

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
});
