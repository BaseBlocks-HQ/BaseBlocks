import { describe, expect, test } from "bun:test";
import { createDocument, textBlock } from "@openeditor/core";
import {
  createOpenEditorPageTabs,
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
});
