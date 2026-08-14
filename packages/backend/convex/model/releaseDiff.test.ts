import { describe, expect, test } from "bun:test";
import { changedField, openEditorContentLines } from "./releaseDiff";

describe("release detail diff", () => {
  test("renders only user-facing page content", () => {
    const lines = openEditorContentLines(
      JSON.stringify({
        type: "doc",
        version: 1,
        content: [
          {
            type: "heading",
            attrs: { level: 2, "openeditor-id": "internal" },
            content: [{ type: "text", text: "History" }],
          },
          {
            type: "paragraph",
            attrs: {
              textAlign: "center",
              "openeditor-id": "paragraph-1",
            },
            content: [
              {
                type: "text",
                text: "An exact snapshot.",
                marks: [{ type: "bold" }],
              },
            ],
          },
          {
            type: "page",
            attrs: {
              pageId: "page-2",
              icon: "📄",
              "openeditor-id": "page-link-1",
            },
            content: [{ type: "text", text: "Linked page" }],
          },
          {
            type: "customBlock",
            attrs: {
              "openeditor-id": "quick-links-asset",
              blockId: "baseblocks.quick-links",
              version: 1,
              data: {
                links: [
                  {
                    id: "link-asset",
                    title: "Documentation",
                    url: "https://example.com",
                    linkType: "website",
                    artwork: { kind: "asset", assetId: "asset-123" },
                  },
                ],
              },
            },
          },
          {
            type: "customBlock",
            attrs: {
              "openeditor-id": "decision-tree-1",
              blockId: "baseblocks.decision-tree",
              version: 1,
              data: {
                tabsMode: "row",
                trees: [
                  {
                    id: "tree-1",
                    label: "Plan Finder",
                    nodes: [
                      {
                        id: "node-1",
                        name: "What do you need?",
                        order: 0,
                        parentId: null,
                        document: {
                          type: "doc",
                          version: 1,
                          content: [
                            {
                              type: "paragraph",
                              attrs: {
                                "openeditor-id": "nested-internal-id",
                              },
                              content: [
                                {
                                  type: "text",
                                  text: "Choose a plan for your team.",
                                },
                              ],
                            },
                          ],
                        },
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
      }),
    );

    expect(lines).toEqual([
      "History",
      "An exact snapshot.",
      "Page: Linked page",
      "Custom Block: Documentation: https://example.com",
      "Custom Block: Plan Finder\nWhat do you need?\nChoose a plan for your team.",
    ]);
    expect(lines.join(" ")).not.toMatch(
      /internal|pageId|kind|asset|assetId|page-2|asset-123|nested-internal-id|📄/,
    );
  });

  test("uses an allowlist for text stored in node attributes", () => {
    const lines = openEditorContentLines(
      JSON.stringify({
        type: "doc",
        version: 1,
        content: [
          {
            type: "image",
            attrs: {
              alt: "Team at the launch event",
              imageId: "image-123",
              "openeditor-id": "image-1",
            },
          },
        ],
      }),
    );

    expect(lines).toEqual(["Image: Team at the launch event"]);
  });

  test("only returns fields whose values changed", () => {
    expect(changedField("Title", "Before", "After")).toEqual({
      label: "Title",
      before: "Before",
      after: "After",
    });
    expect(changedField("Title", "Same", "Same")).toBeNull();
  });
});
