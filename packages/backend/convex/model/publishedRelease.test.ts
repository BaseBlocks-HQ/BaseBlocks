import { describe, expect, test } from "bun:test";
import { canonicalPagePath, parsePublishedPagePath } from "./publishedRelease";

describe("published release paths", () => {
  test("parses the primitive route cache key", () => {
    expect(parsePublishedPagePath("")).toEqual([]);
    expect(parsePublishedPagePath("guides/getting-started")).toEqual([
      "guides",
      "getting-started",
    ]);
  });

  test("canonicalizes a nested release page", () => {
    expect(
      canonicalPagePath(
        { defaultPageId: "home" as never },
        {
          ancestors: [{ slug: "guides" } as never],
          page: { pageId: "start", slug: "getting-started" } as never,
        },
      ),
    ).toEqual(["guides", "getting-started"]);
  });

  test("canonicalizes the default page to the release root", () => {
    expect(
      canonicalPagePath(
        { defaultPageId: "home" as never },
        {
          ancestors: [],
          page: { pageId: "home", slug: "home" } as never,
        },
      ),
    ).toEqual([]);
  });
});
