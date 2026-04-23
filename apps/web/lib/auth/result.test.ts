import { describe, expect, test } from "bun:test";
import { getAuthClientDataOrThrow } from "./result";

describe("getAuthClientDataOrThrow", () => {
  test("returns data when Better Auth succeeds", () => {
    expect(
      getAuthClientDataOrThrow<{ ok: true }>(
        {
          data: { ok: true },
          error: null,
        },
        "Fallback error",
      ),
    ).toEqual({ ok: true });
  });

  test("throws the Better Auth message when the response contains an error", () => {
    expect(() =>
      getAuthClientDataOrThrow(
        {
          data: null,
          error: { message: "User is already a member of this organization" },
        },
        "Fallback error",
      ),
    ).toThrow("User is already a member of this organization");
  });

  test("throws the fallback message when Better Auth returns no data", () => {
    expect(() =>
      getAuthClientDataOrThrow(
        {
          data: null,
          error: null,
        },
        "Fallback error",
      ),
    ).toThrow("Fallback error");
  });
});
