import { describe, expect, test } from "bun:test";
import { createDocument, textBlock } from "@openeditor/core";
import { assertBaseBlocksDocument } from "@baseblocks/openeditor-contracts";
import {
  createOpenEditorPageTabs,
  deleteOpenEditorTextRange,
  readOpenEditorPageTabs,
  resolveOpenEditorPageTabId,
  setOpenEditorPageTabQuery,
} from "./page-tabs-model";

describe("page tabs model", () => {
  test("wraps the existing document in the first tab", () => {
    const document = createDocument([
      textBlock("paragraph", "Existing content"),
    ]);

    const tabbedDocument = createOpenEditorPageTabs(document, "tab-1");

    expect(() => assertBaseBlocksDocument(tabbedDocument)).not.toThrow();

    expect(readOpenEditorPageTabs(tabbedDocument)).toEqual({
      tabs: [{ id: "tab-1", label: "Tab 1", document }],
    });
  });

  test("removes a slash command range before wrapping the document", () => {
    const document = createDocument([
      textBlock("paragraph", "Existing content"),
      textBlock("paragraph", "/tabs"),
    ]);

    expect(deleteOpenEditorTextRange(document, { from: 19, to: 24 })).toEqual({
      ...document,
      content: [document.content[0], { ...document.content[1], content: [] }],
    });
  });

  test("resolves a stable tab ID and preserves unrelated URL state", () => {
    const tabs = [
      { id: "first", label: "First", document: createDocument([]) },
      { id: "second", label: "Second", document: createDocument([]) },
    ];
    expect(resolveOpenEditorPageTabId(tabs, "second")).toBe("second");
    expect(resolveOpenEditorPageTabId(tabs, "missing")).toBe("first");

    const params = setOpenEditorPageTabQuery(
      new URLSearchParams("page=page-1&from=editor"),
      "second",
    );
    expect(params.toString()).toBe("page=page-1&from=editor&tab=second");
  });
});
