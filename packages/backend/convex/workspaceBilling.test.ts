import { describe, expect, test } from "bun:test";
import { getSeatSnapshot } from "./workspaceBilling";

type RegisteredFunction = {
  _handler: (ctx: unknown, args: unknown) => Promise<unknown>;
};

describe("workspace billing seat snapshot", () => {
  test("counts Better Auth members across pages and applies the paid minimum", async () => {
    const pages = [
      {
        page: [{ _id: "m1", userId: "u1" }],
        continueCursor: "next",
        isDone: false,
      },
      { page: [{ _id: "m2", userId: "u2" }], continueCursor: "", isDone: true },
    ];
    const result = await (
      getSeatSnapshot as unknown as RegisteredFunction
    )._handler(
      {
        runQuery: () => Promise.resolve(pages.shift()),
      },
      { organizationId: "org-1" },
    );

    expect(result).toMatchObject({
      organizationId: "org-1",
      activeMemberCount: 2,
      billableSeatCount: 2,
      memberIds: ["m1", "m2"],
      membershipRevision: '["m1","m2"]',
      source: "better-auth-members",
    });
  });

  test("never counts fewer than one paid seat", async () => {
    const result = await (
      getSeatSnapshot as unknown as RegisteredFunction
    )._handler(
      {
        runQuery: () =>
          Promise.resolve({ page: [], continueCursor: "", isDone: true }),
      },
      { organizationId: "org-empty" },
    );
    expect(result).toMatchObject({
      activeMemberCount: 0,
      billableSeatCount: 1,
    });
  });
});
