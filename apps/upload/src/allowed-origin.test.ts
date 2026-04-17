import { describe, expect, test } from "bun:test";
import { isAllowedOrigin, parseAllowedOrigins } from "./allowed-origin";

describe("allowed origins", () => {
  test("matches exact origins", () => {
    const allowedOrigins = parseAllowedOrigins(
      "http://localhost:3001,https://baseblocks.dev",
    );

    expect(isAllowedOrigin("http://localhost:3001", allowedOrigins)).toBe(true);
    expect(isAllowedOrigin("https://baseblocks.dev", allowedOrigins)).toBe(
      true,
    );
    expect(isAllowedOrigin("https://localhost:3001", allowedOrigins)).toBe(
      false,
    );
  });

  test("matches wildcard vercel preview origins", () => {
    const allowedOrigins = parseAllowedOrigins(
      "https://base-blocks-*.vercel.app",
    );

    expect(
      isAllowedOrigin(
        "https://base-blocks-c0vr2anch-naaiyys-projects.vercel.app",
        allowedOrigins,
      ),
    ).toBe(true);
    expect(
      isAllowedOrigin("https://other-project.vercel.app", allowedOrigins),
    ).toBe(false);
  });

  test("rejects invalid origin configuration", () => {
    expect(() =>
      parseAllowedOrigins("https://baseblocks.dev/upload"),
    ).toThrow();
  });
});
