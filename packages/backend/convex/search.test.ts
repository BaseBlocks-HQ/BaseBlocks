import { describe, expect, test } from "bun:test";
import { mergeSearchMatches } from "./search";

type SearchDoc = {
  _id: string;
  kind: "file" | "page";
};

function merge(titleResults: SearchDoc[], contentResults: SearchDoc[]) {
  return mergeSearchMatches({
    titleResults,
    contentResults,
    limit: 20,
    format: (doc, matchType) => ({ id: doc._id, matchType }),
  });
}

describe("search result classification", () => {
  test("a duplicated filename hit is classified as a title match", () => {
    const file = { _id: "report", kind: "file" } as const;

    expect(merge([file], [file])).toEqual([
      { id: "report", matchType: "title" },
    ]);
  });

  test("a term found only in document text remains a content match", () => {
    const file = { _id: "report", kind: "file" } as const;

    expect(merge([], [file])).toEqual([{ id: "report", matchType: "content" }]);
  });
});
