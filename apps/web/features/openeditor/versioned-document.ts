import type { OpenEditorDocument } from "@openeditor/document";

export interface VersionedDocument {
  document: OpenEditorDocument;
  contentHash: string;
}
