import {
  parseOpenEditorDocument as parseOpenEditorDocumentStrict,
  type OpenEditorDocument,
  type ProseMirrorNode,
} from "@openeditor/core";
import {
  assertBaseBlocksDocument,
  baseBlocksDocumentContract,
  projectChildPages,
  validateBaseBlocksNestedDocument,
  type ChildPageProjection,
} from "@baseblocks/openeditor-contracts";
import { baseBlocksBlockRegistry } from "@baseblocks/openeditor-contracts/block-registry";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

export type { OpenEditorDocument } from "@openeditor/core";

export type OpenEditorNode = ProseMirrorNode;

export const emptyOpenEditorDocument = (): OpenEditorDocument =>
  ({
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        // Missing pageDocuments rows are projected in multiple transactions.
        // Their synthesized baseline must have a stable identity so optimistic
        // AI fingerprints do not report a change where none occurred.
        attrs: { "openeditor-id": "oe_empty_document_paragraph" },
      },
    ],
  }) as OpenEditorDocument;

const SHA256_CONTENT_HASH_PREFIX = "sha256:";

/** Hash newly persisted content with an explicit, evolvable algorithm tag. */
export function hashOpenEditorContent(serialized: string): string {
  return `${SHA256_CONTENT_HASH_PREFIX}${bytesToHex(sha256(utf8ToBytes(serialized)))}`;
}

export function parseOpenEditorDocument(value: unknown): OpenEditorDocument {
  const decoded = typeof value === "string" ? JSON.parse(value) : value;
  const document = parseOpenEditorDocumentStrict(decoded, {
    contract: baseBlocksDocumentContract,
    limits: { requireNodeIds: true },
  });
  assertBaseBlocksDocument(document);
  visitOpenEditorDocuments(document, (nested) => {
    if (nested === document) return;
    const validation = validateBaseBlocksNestedDocument(nested);
    if (!validation.valid)
      throw new Error(
        validation.issues
          .slice(0, 20)
          .map((issue) => `${issue.path}: ${issue.message}`)
          .join("\n"),
      );
  });
  visitOpenEditorNodes(document, (node) => {
    if (node.type !== "customBlock") return;
    const resolved = baseBlocksBlockRegistry.resolve(node);
    if (resolved.status !== "ready")
      throw new Error(
        `Invalid custom block ${String(node.attrs?.blockId ?? "unknown")}: ${resolved.status}${resolved.diagnostics.length ? `: ${resolved.diagnostics.map((item) => item.message).join(" ")}` : ""}`,
      );
  });
  return document;
}

export function visitOpenEditorDocuments(
  value: unknown,
  visit: (document: OpenEditorDocument) => void,
): void {
  if (Array.isArray(value)) {
    for (const item of value) visitOpenEditorDocuments(item, visit);
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (
    record.type === "doc" &&
    record.version === 1 &&
    Array.isArray(record.content)
  )
    visit(record as OpenEditorDocument);
  for (const child of Object.values(record)) {
    if (child && typeof child === "object")
      visitOpenEditorDocuments(child, visit);
  }
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
  const attachmentIds = collectOpenEditorAttributeValues(
    content,
    "attachment",
    ["attachmentId"],
  );
  const imageIds = collectOpenEditorAttributeValues(content, "image", [
    "imageId",
  ]);
  const customAssetIds = new Set<string>();
  visitOpenEditorNodes(content, (node) => {
    if (node.type !== "customBlock") return;
    for (const reference of baseBlocksBlockRegistry.assets(node.attrs))
      customAssetIds.add(reference.id);
  });
  return {
    libraryIds: collectOpenEditorAttributeValues(content, "customBlock", [
      "data",
      "libraryId",
    ]),
    attachmentIds,
    imageIds,
    customAssetIds,
    fileIds: new Set([...attachmentIds, ...imageIds, ...customAssetIds]),
    pageIds: collectOpenEditorAttributeValues(content, "page", ["pageId"]),
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

export function synchronizeOpenEditorChildPages(
  document: OpenEditorDocument,
  children: readonly ChildPageProjection[],
): OpenEditorDocument {
  return projectChildPages(document, children);
}

export function extractOpenEditorText(content: OpenEditorDocument): string {
  const parts: string[] = [];
  visitOpenEditorNodes(content, (node) => {
    if (typeof node.text === "string") parts.push(node.text);
    const attrs = node.attrs;
    if (!attrs) return;
    if (node.type === "customBlock") {
      const resolved = baseBlocksBlockRegistry.resolve(node);
      if (resolved.status === "ready")
        parts.push(baseBlocksBlockRegistry.toText(node));
      return;
    }
    if (node.type === "baseblocksPageTabs") {
      const tabs = (attrs.tabs as { tabs?: unknown } | undefined)?.tabs;
      if (Array.isArray(tabs))
        for (const tab of tabs)
          if (
            tab &&
            typeof tab === "object" &&
            !Array.isArray(tab) &&
            typeof (tab as { label?: unknown }).label === "string"
          )
            parts.push((tab as { label: string }).label);
      return;
    }
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
