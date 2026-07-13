import { describe, expect, test } from "bun:test";
import {
  type OpenEditorDocument,
  referencesOpenEditorPage,
} from "./pageContentFormat";

describe("referencesOpenEditorPage", () => {
  test("finds a page referenced by an OpenEditor page block", () => {
    const content: OpenEditorDocument = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "page",
          attrs: { pageId: "page-2", icon: "🚕" },
          content: [{ type: "text", text: "Process taxi" }],
        },
      ],
    };

    expect(referencesOpenEditorPage(content, "page-2")).toBe(true);
    expect(referencesOpenEditorPage(content, "page-3")).toBe(false);
  });

  test("ignores pageId attributes on other block types", () => {
    const content: OpenEditorDocument = {
      type: "doc",
      version: 1,
      content: [{ type: "paragraph", attrs: { pageId: "page-2" } }],
    };

    expect(referencesOpenEditorPage(content, "page-2")).toBe(false);
  });
});
