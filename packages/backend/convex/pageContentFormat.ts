import {
  createDocument,
  parseOpenEditorDocument as parseOpenEditorDocumentStrict,
  type OpenEditorDocument,
  type ProseMirrorNode,
} from "@openeditor/core";

export type { OpenEditorDocument } from "@openeditor/core";

export type OpenEditorNode = ProseMirrorNode;

export const emptyOpenEditorDocument = (): OpenEditorDocument =>
  createDocument([{ type: "paragraph" }]);

export function parseOpenEditorDocument(value: unknown): OpenEditorDocument {
  const decoded = typeof value === "string" ? JSON.parse(value) : value;
  return parseOpenEditorDocumentStrict(decoded);
}

export function visitOpenEditorNodes(
  value: unknown,
  visit: (node: OpenEditorNode) => void,
): void {
  if (Array.isArray(value)) {
    for (const item of value) visitOpenEditorNodes(item, visit);
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (typeof record.type === "string" && record.type !== "doc") {
    visit(record as OpenEditorNode);
  }
  for (const child of Object.values(record)) {
    if (child && typeof child === "object") visitOpenEditorNodes(child, visit);
  }
}

export function collectOpenEditorAttributeValues(
  content: OpenEditorDocument,
  nodeType: string,
  attributePath: string[],
): Set<string> {
  const values = new Set<string>();
  visitOpenEditorNodes(content, (node) => {
    if (node.type !== nodeType) return;
    let value: unknown = node.attrs;
    for (const key of attributePath) {
      if (!value || typeof value !== "object") return;
      value = (value as Record<string, unknown>)[key];
    }
    if (typeof value === "string" && value) values.add(value);
  });
  return values;
}

export function extractOpenEditorReferences(content: OpenEditorDocument) {
  return {
    libraryIds: collectOpenEditorAttributeValues(content, "baseblocksLibrary", [
      "library",
      "libraryId",
    ]),
    fileIds: collectOpenEditorAttributeValues(content, "attachment", [
      "attachmentId",
    ]),
  };
}

export function referencesOpenEditorPage(
  content: OpenEditorDocument,
  pageId: string,
): boolean {
  return collectOpenEditorAttributeValues(content, "page", ["pageId"]).has(
    pageId,
  );
}

export function extractOpenEditorText(content: OpenEditorDocument): string {
  const parts: string[] = [];
  visitOpenEditorNodes(content, (node) => {
    if (typeof node.text === "string") parts.push(node.text);
    const attrs = node.attrs;
    if (!attrs) return;
    for (const key of ["name", "title", "label", "description", "code"]) {
      if (typeof attrs[key] === "string") parts.push(attrs[key] as string);
    }
    const collectStrings = (value: unknown, key?: string): void => {
      if (typeof value === "string") {
        if (
          key &&
          key !== "id" &&
          !key.endsWith("Id") &&
          !["url", "src", "href"].includes(key)
        ) {
          parts.push(value);
        }
        return;
      }
      if (Array.isArray(value)) {
        for (const item of value) collectStrings(item);
        return;
      }
      if (!value || typeof value !== "object") return;
      for (const [childKey, child] of Object.entries(value)) {
        collectStrings(child, childKey);
      }
    };
    for (const [key, value] of Object.entries(attrs)) {
      if (!["name", "title", "label", "description", "code"].includes(key)) {
        collectStrings(value, key);
      }
    }
  });
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
