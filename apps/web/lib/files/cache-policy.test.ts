import { describe, expect, test } from "bun:test";
import { fileCacheControl } from "./cache-policy";

describe("file cache policy", () => {
  test("never permits shared caching for member-authorized images", () => {
    expect(fileCacheControl("member", "image/png")).toBe("private, no-store");
  });

  test("permits short shared caching for public images", () => {
    expect(fileCacheControl("public", "image/png")).toBe(
      "public, max-age=300, stale-while-revalidate=3600",
    );
  });

  test("keeps non-image downloads private even on public sites", () => {
    expect(fileCacheControl("public", "application/pdf")).toBe(
      "private, no-store",
    );
  });
});
