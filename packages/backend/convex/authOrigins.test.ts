import { describe, expect, test } from "bun:test";
import { parseAuthOrigin, parseAuthOrigins } from "./authOrigins";

describe("parseAuthOrigins", () => {
  test("normalizesAndDeduplicatesOrigins", () => {
    expect(
      parseAuthOrigins(
        "http://localhost:3001/, https://demo.tail.ts.net , http://localhost:3001",
      ),
    ).toEqual(["http://localhost:3001", "https://demo.tail.ts.net"]);
  });

  test("fallsBackToDefaultLocalOrigin", () => {
    expect(parseAuthOrigins(undefined)).toEqual(["http://localhost:3001"]);
  });

  test("failsWhenOriginIncludesPath", () => {
    expect(() => parseAuthOrigins("https://demo.tail.ts.net/login")).toThrow(
      "APP_URL must contain origins only",
    );
  });

  test("parsesSingleOriginForOtherEnvNames", () => {
    expect(
      parseAuthOrigin("https://dutiful-aardvark-750.convex.site", "SITE_URL"),
    ).toBe("https://dutiful-aardvark-750.convex.site");
  });
});
