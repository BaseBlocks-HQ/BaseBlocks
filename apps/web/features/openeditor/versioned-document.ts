import type { OpenEditorDocument } from "@openeditor/core";

export interface VersionedDocument {
  document: OpenEditorDocument;
  contentHash: string;
}
