import { describe, expect, test } from "bun:test";
import { getSitesWithReadablePages } from "./use-site-navigation";

describe("site navigation page queries", () => {
  test("does not request pages while a historical restore owns the site", () => {
    const readableSite = { _id: "site-readable" };
    const restoringSite = {
      _id: "site-restoring",
      activeDraftRestoreId: "restore-1",
    };

    expect(getSitesWithReadablePages([readableSite, restoringSite])).toEqual([
      readableSite,
    ]);
  });
});
