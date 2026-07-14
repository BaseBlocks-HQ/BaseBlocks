import { describe, expect, test } from "bun:test";
import {
  type OpenEditorDocument,
  parseOpenEditorDocument,
  referencesOpenEditorPage,
} from "./pageContentFormat";

describe("parseOpenEditorDocument", () => {
  test("accepts a supported versioned document", () => {
    const document = parseOpenEditorDocument({
      type: "doc",
      version: 1,
      content: [{ type: "paragraph" }],
    });
    expect(document).toMatchObject({
      type: "doc",
      version: 1,
      content: [{ type: "paragraph" }],
    });
    expect(document.content[0]?.attrs?.["openeditor-id"]).toBeString();
  });

  test("decodes persisted JSON before strict parsing", () => {
    const document = parseOpenEditorDocument(
      JSON.stringify({
        type: "doc",
        version: 1,
        content: [{ type: "paragraph" }],
      }),
    );

    expect(document).toMatchObject({
      type: "doc",
      version: 1,
      content: [{ type: "paragraph" }],
    });
  });

  test("rejects unknown document versions", () => {
    expect(() =>
      parseOpenEditorDocument({ type: "doc", version: 2, content: [] }),
    ).toThrow("Document version must be 1");
  });

  test("rejects unversioned ProseMirror documents", () => {
    expect(() =>
      parseOpenEditorDocument({ type: "doc", content: [] }),
    ).toThrow("Document version must be 1");
  });
});

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
