import { describe, expect, test } from "bun:test";
import { shouldApplyProviderUpdate } from "./billingEventOrdering";

describe("billing provider event ordering", () => {
  test("accepts the first, newer, and idempotent same-version event", () => {
    expect(shouldApplyProviderUpdate(undefined, 100)).toBe(true);
    expect(shouldApplyProviderUpdate(100, 101)).toBe(true);
    expect(shouldApplyProviderUpdate(100, 100)).toBe(true);
  });

  test("rejects an out-of-order provider event", () => {
    expect(shouldApplyProviderUpdate(200, 199)).toBe(false);
  });
});
