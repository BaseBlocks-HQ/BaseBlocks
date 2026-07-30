import { describe, expect, test } from "bun:test";
import { changedField, openEditorContentLines } from "./releaseDiff";

describe("release detail diff", () => {
  test("renders editor content as readable page lines without internal ids", () => {
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
            attrs: { textAlign: "center" },
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
            attrs: { pageId: "page-2", icon: "📄" },
            content: [{ type: "text", text: "Linked page" }],
          },
        ],
      }),
    );

    expect(lines).toEqual([
      "History",
      "An exact snapshot.",
      "Page: Linked page · pageId: page-2 · icon: 📄",
    ]);
    expect(lines.join(" ")).not.toContain("internal");
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
