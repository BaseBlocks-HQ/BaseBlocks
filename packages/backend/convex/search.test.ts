import { describe, expect, test } from "bun:test";
import {
  extractSearchExcerpt,
  isPublishedSearchEntryForRelease,
  mergeSearchMatches,
  normalizeSearchLimit,
} from "./search";

type SearchDoc = {
  _id: string;
  kind: "file" | "page";
};

function merge(titleResults: SearchDoc[], contentResults: SearchDoc[]) {
  return mergeSearchMatches({
    titleResults,
    contentResults,
    limit: 20,
  });
}

describe("search result classification", () => {
  test("a duplicated filename hit is classified as a title match", () => {
    const file = { _id: "report", kind: "file" } as const;

    expect(merge([file], [file])).toEqual([{ doc: file, match: "title" }]);
  });

  test("a term found only in document text remains a content match", () => {
    const file = { _id: "report", kind: "file" } as const;

    expect(merge([], [file])).toEqual([{ doc: file, match: "content" }]);
  });
});

describe("search excerpts", () => {
  test("returns highlight offsets for a case-insensitive match", () => {
    expect(
      extractSearchExcerpt("A quarterly Revenue report", "revenue"),
    ).toEqual({
      text: "A quarterly Revenue report",
      matchStart: 12,
      matchEnd: 19,
    });
  });

  test("adds ellipses without shifting the highlighted text", () => {
    expect(
      extractSearchExcerpt("0123456789matchabcdefghij", "match", 3),
    ).toEqual({
      text: "…789matchabc…",
      matchStart: 4,
      matchEnd: 9,
    });
  });

  test("returns null when content does not match", () => {
    expect(extractSearchExcerpt("document", "missing")).toBeNull();
  });
});

describe("search result limits", () => {
  test("uses a bounded positive integer limit", () => {
    expect(normalizeSearchLimit(undefined)).toBe(20);
    expect(normalizeSearchLimit(Number.NaN)).toBe(20);
    expect(normalizeSearchLimit(-5)).toBe(1);
    expect(normalizeSearchLimit(4.8)).toBe(4);
    expect(normalizeSearchLimit(500)).toBe(50);
  });
});

describe("published search release fencing", () => {
  test("ignores entries that were not projected for the current release", () => {
    expect(
      isPublishedSearchEntryForRelease(
        { releaseId: "release-2" as never },
        "release-2" as never,
      ),
    ).toBe(true);
    expect(
      isPublishedSearchEntryForRelease(
        { releaseId: "release-1" as never },
        "release-2" as never,
      ),
    ).toBe(false);
    expect(isPublishedSearchEntryForRelease({}, "release-2" as never)).toBe(
      false,
    );
  });
});
