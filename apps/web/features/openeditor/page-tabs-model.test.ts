import { describe, expect, test } from "bun:test";
import { createDocument, textBlock } from "@openeditor/core";
import {
  createOpenEditorPageTabs,
  deleteOpenEditorTextRange,
  readOpenEditorPageTabs,
} from "./page-tabs-model";

describe("page tabs model", () => {
  test("wraps the existing document in the first tab", () => {
    const document = createDocument([
      textBlock("paragraph", "Existing content"),
    ]);

    const tabbedDocument = createOpenEditorPageTabs(document, "tab-1");

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
});
