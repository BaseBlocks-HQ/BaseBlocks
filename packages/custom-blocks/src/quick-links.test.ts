import { describe, expect, test } from "bun:test";
import {
  destinationLabel,
  duplicateQuickLink,
  moveQuickLink,
  updateQuickLink,
  safeQuickLinkHref,
} from "./quick-links";
import { quickLinksBlock } from "./index";

describe("quick links data", () => {
  test("migrates website links and removes unsupported app links and icons", () => {
    expect(
      quickLinksBlock.migrate?.({
        version: 1,
        data: {
          links: [
            {
              id: "website",
              title: "Website",
              url: "https://example.com",
              linkType: "website",
              artwork: { kind: "asset", assetId: "website-image" },
            },
            {
              id: "icon",
              title: "Icon",
              url: "/icon",
              linkType: "website",
              artwork: { kind: "icon", id: "book" },
            },
            {
              id: "app",
              title: "App",
              url: "baseblocks://open",
              linkType: "app",
            },
          ],
        },
      }),
    ).toEqual({
      blockId: "baseblocks.quick-links",
      version: 2,
      data: {
        links: [
          {
            id: "website",
            title: "Website",
            url: "https://example.com",
            imageAssetId: "website-image",
          },
          { id: "icon", title: "Icon", url: "/icon" },
        ],
      },
    });
  });

  test("accepts site-relative and HTTP links but rejects executable URLs", () => {
    expect(
      safeQuickLinkHref({
        id: "1",
        title: "Page",
        url: "/about",
      }),
    ).toBe("/about");
    expect(
      safeQuickLinkHref({
        id: "2",
        title: "Web",
        url: "https://example.com",
      }),
    ).toBe("https://example.com");
    expect(
      safeQuickLinkHref({
        id: "query",
        title: "Query",
        url: "https://example.com/search?a=1&b=2",
      }),
    ).toBe("https://example.com/search?a=1&b=2");
    expect(
      safeQuickLinkHref({
        id: "3",
        title: "Bad",
        url: "javascript:alert(1)",
      }),
    ).toBeNull();
    expect(
      safeQuickLinkHref({
        id: "encoded",
        title: "Encoded",
        url: "jav&#x61;script:alert(1)",
      }),
    ).toBeNull();
    expect(
      safeQuickLinkHref({
        id: "scheme",
        title: "App scheme",
        url: "data://payload",
      }),
    ).toBeNull();
  });

  test("describes and edits destinations", () => {
    expect(
      destinationLabel({
        id: "1",
        title: "Page",
        url: "/about",
      }),
    ).toBe("BaseBlocks page");
    expect(
      destinationLabel({
        id: "2",
        title: "Docs",
        url: "https://www.example.com/docs",
      }),
    ).toBe("example.com");
    const website = {
      id: "docs",
      title: "Open docs",
      url: "https://example.com/docs",
    };
    expect(
      updateQuickLink([website], { ...website, title: "Read docs" })[0],
    ).toEqual({
      ...website,
      title: "Read docs",
    });
  });

  test("duplicates and reorders links with portable image references", () => {
    const original = {
      id: "one",
      title: "Docs",
      url: "/docs",
      imageAssetId: "docs-image",
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
