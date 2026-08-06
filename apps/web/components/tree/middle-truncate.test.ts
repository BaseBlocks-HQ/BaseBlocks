import { describe, expect, test } from "bun:test";
import { getMiddleTruncateParts } from "./middle-truncate";

describe("middle truncation", () => {
  test("keeps short labels intact", () => {
    expect(getMiddleTruncateParts("Short label")).toEqual(["Short label", ""]);
  });

  test("preserves the exact beginning and end of long labels", () => {
    const text = "Organisation inter plateau";
    const [leading, trailing] = getMiddleTruncateParts(text);

    expect(leading + trailing).toBe(text);
    expect(leading.length).toBeGreaterThan(trailing.length);
    expect(trailing).toBe(" plateau");
  });
});
