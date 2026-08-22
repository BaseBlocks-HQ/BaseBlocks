import { describe, expect, test } from "bun:test";
import { getWorkspaceBillingSnapshot } from "./workspaceBilling";

type RegisteredFunction = {
  _handler: (ctx: unknown, args: unknown) => Promise<unknown>;
};

describe("workspace billing snapshot", () => {
  test("counts Better Auth members across pages and keeps the provider minimum separate", async () => {
    const pages = [
      {
        page: [{ _id: "m1", userId: "u1" }],
        continueCursor: "next",
        isDone: false,
      },
      { page: [{ _id: "m2", userId: "u2" }], continueCursor: "", isDone: true },
    ];
    const result = await (
      getWorkspaceBillingSnapshot as unknown as RegisteredFunction
    )._handler(
      {
        runQuery: () => Promise.resolve(pages.shift()),
      },
      { organizationId: "org-1" },
    );

    expect(result).toMatchObject({
      organizationId: "org-1",
      workspaceMemberCount: 2,
      seatQuantity: 2,
      memberIds: ["m1", "m2"],
      membershipRevision: '["m1","m2"]',
    });
  });

  test("keeps an empty workspace at zero members and one provider seat", async () => {
    const result = await (
      getWorkspaceBillingSnapshot as unknown as RegisteredFunction
    )._handler(
      {
        runQuery: () =>
          Promise.resolve({ page: [], continueCursor: "", isDone: true }),
      },
      { organizationId: "org-empty" },
    );
    expect(result).toMatchObject({
      workspaceMemberCount: 0,
      seatQuantity: 1,
    });
  });
});
