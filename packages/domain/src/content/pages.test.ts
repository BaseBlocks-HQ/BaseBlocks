import { describe, expect, test } from "bun:test";
import { MAX_PAGE_TITLE_LENGTH, normalizePageTitle } from "./pages";

describe("page title", () => {
  test("trims a valid title", () => {
    expect(normalizePageTitle("  Getting started  ")).toBe("Getting started");
  });

  test("rejects an empty title", () => {
    expect(() => normalizePageTitle("   ")).toThrow("cannot be empty");
  });

  test("rejects a title over the shared limit", () => {
    expect(() =>
      normalizePageTitle("x".repeat(MAX_PAGE_TITLE_LENGTH + 1)),
    ).toThrow(`cannot exceed ${MAX_PAGE_TITLE_LENGTH} characters`);
  });
});
