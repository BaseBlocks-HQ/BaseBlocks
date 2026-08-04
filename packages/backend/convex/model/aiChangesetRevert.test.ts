import { describe, expect, test } from "bun:test";
import { assertAiChangesetCanRevert } from "./aiChangesetRevert";

describe("AI changeset revert guard", () => {
  test("permits reverting the latest AI operation", () => {
    expect(() =>
      assertAiChangesetCanRevert({
        isLatestUnrevertedOperation: true,
      }),
    ).not.toThrow();
  });

  test("rejects an older operation while a newer one remains", () => {
    expect(() =>
      assertAiChangesetCanRevert({
        isLatestUnrevertedOperation: false,
      }),
    ).toThrow("newer AI change");
  });

  test("rejects repeated reverts", () => {
    expect(() =>
      assertAiChangesetCanRevert({
        isLatestUnrevertedOperation: true,
        revertedAt: Date.now(),
      }),
    ).toThrow("already reverted");
  });
});
