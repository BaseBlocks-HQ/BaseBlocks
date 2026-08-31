import { describe, expect, test } from "bun:test";
import {
  createDocument,
  textBlock,
  type OpenEditorDocument,
} from "@openeditor/document";
import {
  areOpenEditorDocumentsEqual,
  shouldSyncOpenEditorDocument,
} from "./open-editor-document-sync";

const document = createDocument([textBlock("paragraph", "Keep typing here")]);

describe("OpenEditor document synchronization", () => {
  test("treats an equal save echo as the same document", () => {
    const saveEcho = JSON.parse(JSON.stringify(document));

    expect(areOpenEditorDocumentsEqual(document, saveEcho)).toBe(true);
    expect(shouldSyncOpenEditorDocument(document, saveEcho)).toBe(false);
  });

  test("syncs a document with a real content change", () => {
    const changedDocument = createDocument([
      textBlock("paragraph", "New remote content"),
    ]);

    expect(shouldSyncOpenEditorDocument(document, changedDocument)).toBe(true);
  });

  test("does not resync a locally emitted document while the controller catches up", () => {
    const locallyEmittedDocument = createDocument([
      textBlock("paragraph", "Local content"),
    ]);
    const saveEcho = JSON.parse(JSON.stringify(locallyEmittedDocument));

    expect(
      shouldSyncOpenEditorDocument(document, saveEcho, locallyEmittedDocument),
    ).toBe(false);
  });

  test("ignores object key order when comparing equivalent documents", () => {
    const reorderedDocument = Object.fromEntries(
      Object.entries(document).reverse(),
    ) as OpenEditorDocument;

    expect(areOpenEditorDocumentsEqual(document, reorderedDocument)).toBe(true);
    expect(shouldSyncOpenEditorDocument(document, reorderedDocument)).toBe(
      false,
    );
  });
});
