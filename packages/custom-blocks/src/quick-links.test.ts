import { describe, expect, test } from "bun:test";
import {
  destinationLabel,
  duplicateQuickLink,
  moveQuickLink,
  updateQuickLink,
  safeQuickLinkHref,
} from "./quick-links";

describe("quick links data", () => {
  test("accepts site-relative and HTTP links but rejects executable URLs", () => {
    expect(
      safeQuickLinkHref({
        id: "1",
        title: "Page",
        url: "/about",
        linkType: "website",
      }),
    ).toBe("/about");
    expect(
      safeQuickLinkHref({
        id: "2",
        title: "Web",
        url: "https://example.com",
        linkType: "website",
      }),
    ).toBe("https://example.com");
    expect(
      safeQuickLinkHref({
        id: "query",
        title: "Query",
        url: "https://example.com/search?a=1&b=2",
        linkType: "website",
      }),
    ).toBe("https://example.com/search?a=1&b=2");
    expect(
      safeQuickLinkHref({
        id: "3",
        title: "Bad",
        url: "javascript:alert(1)",
        linkType: "website",
      }),
    ).toBeNull();
    expect(
      safeQuickLinkHref({
        id: "encoded",
        title: "Encoded",
        url: "jav&#x61;script:alert(1)",
        linkType: "website",
      }),
    ).toBeNull();
    expect(
      safeQuickLinkHref({
        id: "4",
        title: "Bad app",
        url: "data://payload",
        linkType: "app",
      }),
    ).toBeNull();
  });

  test("describes and edits destinations", () => {
    expect(
      destinationLabel({
        id: "1",
        title: "Page",
        url: "/about",
        linkType: "website",
      }),
    ).toBe("BaseBlocks page");
    expect(
      destinationLabel({
        id: "2",
        title: "Docs",
        url: "https://www.example.com/docs",
        linkType: "website",
      }),
    ).toBe("example.com");
    const app = {
      id: "app",
      title: "Open app",
      url: "baseblocks://open",
      linkType: "app" as const,
    };
    expect(updateQuickLink([app], { ...app, title: "Launch app" })[0]).toEqual({
      ...app,
      title: "Launch app",
    });
  });

  test("duplicates and reorders links with portable artwork references", () => {
    const original = {
      id: "one",
      title: "Docs",
      url: "/docs",
      linkType: "website" as const,
      artwork: { kind: "icon" as const, id: "book" },
    };
    expect(duplicateQuickLink(original, "copy")).toEqual({
      ...original,
      id: "copy",
      title: "Docs copy",
    });
    expect(
      moveQuickLink([original, { ...original, id: "two" }], "two", -1).map(
        ({ id }) => id,
      ),
    ).toEqual(["two", "one"]);
  });
});
