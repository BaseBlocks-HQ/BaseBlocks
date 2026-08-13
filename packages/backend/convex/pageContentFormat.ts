import {
  parseOpenEditorDocument as parseOpenEditorDocumentStrict,
  type OpenEditorDocument,
  type ProseMirrorNode,
} from "@openeditor/core";
import {
  assertBaseBlocksDocument,
  baseBlocksDocumentContract,
  projectChildPages,
  type ChildPageProjection,
} from "@baseblocks/openeditor-contracts";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  extractOpenEditorCustomBlockAssetReferences,
  type OpenEditorCustomBlockDataSchema,
  validateOpenEditorCustomBlockDataValue,
  validateOpenEditorCustomBlockEnvelope,
} from "@openeditor/custom-block";
import { baseBlocksCustomBlockManifests } from "@baseblocks/custom-blocks/manifests";
import { baseBlocksCoreBlockManifests } from "@baseblocks/openeditor-contracts/core-manifests";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

export type { OpenEditorDocument } from "@openeditor/core";

export type OpenEditorNode = ProseMirrorNode;

export const baseBlocksManifests = [
  ...baseBlocksCustomBlockManifests,
  ...baseBlocksCoreBlockManifests,
] as const;

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
  visitOpenEditorNodes(document, (node) => {
    if (node.type !== "customBlock") return;
    const result = validateOpenEditorCustomBlockEnvelope(
      node.attrs,
      baseBlocksManifests,
    );
    if (!result.valid) {
      throw new Error(
        `Invalid custom block: ${result.diagnostics.map(({ path, message }) => `${path}: ${message}`).join("; ")}`,
      );
    }
  });
  return document;
}

function visitOpenEditorNodes(
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
  if (Array.isArray(record.content)) {
    visitOpenEditorNodes(record.content, visit);
  }
  if (record.type === "customBlock" && record.attrs) {
    const attrs = record.attrs as Record<string, unknown>;
    const manifest = baseBlocksManifests.find(({ id }) => id === attrs.blockId);
    const validation = manifest
      ? validateOpenEditorCustomBlockEnvelope(attrs, baseBlocksManifests)
      : null;
    if (manifest && validation?.valid && !("status" in validation)) {
      visitOpenEditorDeclaredDocuments(attrs.data, manifest.dataSchema, visit);
    }
  }
}

function visitOpenEditorDeclaredDocuments(
  value: unknown,
  schema: OpenEditorCustomBlockDataSchema,
  visit: (node: OpenEditorNode) => void,
): void {
  if (schema.type === "document") {
    visitOpenEditorNodes(value, visit);
    return;
  }
  if (schema.type === "oneOf") {
    for (const variant of schema.variants) {
      if (validateOpenEditorCustomBlockDataValue(value, variant).valid) {
        visitOpenEditorDeclaredDocuments(value, variant, visit);
        break;
      }
    }
    return;
  }
  if (schema.type === "array" && schema.items && Array.isArray(value)) {
    for (const item of value)
      visitOpenEditorDeclaredDocuments(item, schema.items, visit);
    return;
  }
  if (
    schema.type === "object" &&
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    for (const [key, child] of Object.entries(value)) {
      const childSchema = schema.properties?.[key];
      if (childSchema)
        visitOpenEditorDeclaredDocuments(child, childSchema, visit);
    }
  }
}

function collectOpenEditorAttributeValues(
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
  const libraryIds = new Set<string>();
  visitOpenEditorNodes(content, (node) => {
    if (node.type !== "customBlock" || !node.attrs) return;
    for (const reference of extractOpenEditorCustomBlockAssetReferences(
      node.attrs,
      baseBlocksManifests,
    ))
      customAssetIds.add(reference.id);
    if (node.attrs.blockId === "baseblocks.library") {
      const validation = validateOpenEditorCustomBlockEnvelope(
        node.attrs,
        baseBlocksManifests,
      );
      const libraryId = (node.attrs.data as { libraryId?: unknown } | undefined)
        ?.libraryId;
      if (
        validation.valid &&
        !("status" in validation) &&
        typeof libraryId === "string" &&
        libraryId
      )
        libraryIds.add(libraryId);
    }
  });
  return {
    libraryIds,
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
  return projectChildPages(document, children, baseBlocksManifests);
}
