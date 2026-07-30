import { describe, expect, test } from "bun:test";
import {
  findReleaseForDraftRevision,
  publicationActionForTarget,
} from "./releaseState";

describe("release promotion", () => {
  test("moving from version 2 to version 1 is a rollback", () => {
    expect(publicationActionForTarget(2, 1)).toBe("rollback");
  });

  test("version 2 can be promoted again after rolling back to version 1", () => {
    expect(publicationActionForTarget(1, 2)).toBe("republish");
  });

  test("publishing when nothing is live is a republish operation", () => {
    expect(publicationActionForTarget(undefined, 1)).toBe("republish");
  });
});

describe("release reuse", () => {
  test("reuses the newest release created from the unchanged draft", () => {
    const releases = [
      { number: 7, sourceDraftRevision: 5 },
      { number: 6, sourceDraftRevision: 5 },
      { number: 4, sourceDraftRevision: 4 },
    ];

    expect(findReleaseForDraftRevision(releases, 5)?.number).toBe(7);
  });

  test("does not reuse a release after the draft changes", () => {
    const releases = [{ number: 7, sourceDraftRevision: 5 }];

    expect(findReleaseForDraftRevision(releases, 6)).toBeUndefined();
  });
});
