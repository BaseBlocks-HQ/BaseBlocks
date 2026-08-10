import { describe, expect, test } from "bun:test";
import { deleteAccountApplicationAccess } from "./organizations";

type RegisteredFunction = {
  _handler: (ctx: unknown, args: unknown) => Promise<unknown>;
};

describe("account application access deletion", () => {
  test("removes guest grants that would outlive shared memberships", async () => {
    const deleted: string[] = [];
    const result = await (
      deleteAccountApplicationAccess as unknown as RegisteredFunction
    )._handler(
      {
        db: {
          delete: async (id: string) => deleted.push(id),
          query: () => ({
            withIndex: () => ({
              collect: async () => [{ _id: "grant-1" }, { _id: "grant-2" }],
            }),
          }),
        },
      },
      { userId: "user-1" },
    );

    expect(deleted).toEqual(["grant-1", "grant-2"]);
    expect(result).toEqual({ deletedGuestGrantCount: 2 });
  });
});
