import { describe, expect, test } from "bun:test";
import {
  type EditorSiteSwitcherSite,
  getEditorSiteSwitcherSites,
} from "./editor-site-switcher";

function site(
  overrides: Partial<EditorSiteSwitcherSite> &
    Pick<EditorSiteSwitcherSite, "_id">,
): EditorSiteSwitcherSite {
  return {
    _id: overrides._id,
    isPublished: overrides.isPublished ?? false,
    name: overrides.name ?? overrides._id,
    slug: overrides.slug ?? overrides._id,
    logoUrl: overrides.logoUrl,
  };
}

describe("getEditorSiteSwitcherSites", () => {
  test("keeps the current site first and sorts the rest by name", () => {
    const result = getEditorSiteSwitcherSites(
      [
        site({ _id: "site-b", name: "Bravo" }),
        site({ _id: "site-c", name: "charlie" }),
        site({ _id: "site-a", name: "Alpha" }),
      ],
      "site-b",
    );

    expect(result.map((entry) => entry._id)).toEqual([
      "site-b",
      "site-a",
      "site-c",
    ]);
  });

  test("falls back to alphabetical ordering when the current site is missing", () => {
    const result = getEditorSiteSwitcherSites(
      [
        site({ _id: "site-b", name: "Bravo" }),
        site({ _id: "site-a", name: "Alpha" }),
      ],
      "site-z",
    );

    expect(result.map((entry) => entry._id)).toEqual(["site-a", "site-b"]);
  });
});
