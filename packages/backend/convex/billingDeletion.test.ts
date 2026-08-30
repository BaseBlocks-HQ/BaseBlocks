import { describe, expect, test } from "bun:test";
import { terminateWorkspaceBilling } from "./billing";
import { terminateSubscriptionForWorkspaceDeletion } from "./billingModel";

type RegisteredFunction = {
  _handler: (ctx: unknown, args: unknown) => Promise<unknown>;
};

describe("workspace billing deletion", () => {
  test("allows unsubscribed workspace deletion without billing configuration", async () => {
    const previousEnvironment = process.env.BASEBLOCKS_BILLING_ENVIRONMENT;
    delete process.env.BASEBLOCKS_BILLING_ENVIRONMENT;

    try {
      const result = await (
        terminateWorkspaceBilling as unknown as RegisteredFunction
      )._handler(
        {
          auth: {
            getUserIdentity: async () => ({ subject: "user-1" }),
          },
          runQuery: async (_reference: unknown, args: unknown) => {
            if (typeof args === "object" && args !== null && "model" in args) {
              return {
                _id: "member-1",
                organizationId: "organization-1",
                role: "owner",
                userId: "user-1",
              };
            }
            return { canDelete: true };
          },
        },
        { organizationId: "organization-1" },
      );

      expect(result).toEqual({ state: "notSubscribed" });
    } finally {
      if (previousEnvironment === undefined) {
        delete process.env.BASEBLOCKS_BILLING_ENVIRONMENT;
      } else {
        process.env.BASEBLOCKS_BILLING_ENVIRONMENT = previousEnvironment;
      }
    }
  });

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
