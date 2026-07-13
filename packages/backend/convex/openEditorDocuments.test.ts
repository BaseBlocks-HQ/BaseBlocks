import { describe, expect, test } from "bun:test";
import {
  collectOpenEditorAttributeValues,
  extractOpenEditorText,
  parseOpenEditorDocument,
  removeOpenEditorNodes,
} from "./openEditorDocuments";

const document = parseOpenEditorDocument({
  type: "doc",
  version: 1,
  content: [
    { type: "paragraph", content: [{ type: "text", text: "Welcome" }] },
    { type: "page", attrs: { pageId: "page-1" } },
    {
      type: "baseblocksPageTabs",
      attrs: {
        tabs: {
          tabs: [
            {
              id: "tab-1",
              label: "Details",
              document: {
                type: "doc",
                version: 1,
                content: [
                  { type: "page", attrs: { pageId: "page-2" } },
                  {
                    type: "baseblocksLibrary",
                    attrs: { library: { libraryId: "library-1" } },
                  },
                ],
              },
            },
          ],
        },
      },
    },
  ],
});

describe("OpenEditor document helpers", () => {
  test("finds references in top-level and nested documents", () => {
    expect(
      collectOpenEditorAttributeValues(document, "page", ["pageId"]),
    ).toEqual(new Set(["page-1", "page-2"]));
    expect(
      collectOpenEditorAttributeValues(document, "baseblocksLibrary", [
        "library",
        "libraryId",
      ]),
    ).toEqual(new Set(["library-1"]));
  });

  test("removes matching nodes at every nesting level", () => {
    const next = removeOpenEditorNodes(
      document,
      (node) => node.type === "page" && node.attrs?.pageId === "page-2",
    );
    expect(
      collectOpenEditorAttributeValues(parseOpenEditorDocument(next), "page", [
        "pageId",
      ]),
    ).toEqual(new Set(["page-1"]));
  });

  test("extracts visible text without indexing IDs or URLs", () => {
    const text = extractOpenEditorText(document);
    expect(text).toContain("Welcome");
    expect(text).toContain("Details");
    expect(text).not.toContain("page-1");
    expect(text).not.toContain("library-1");
  });
});
