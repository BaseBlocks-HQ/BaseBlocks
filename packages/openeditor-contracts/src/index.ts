import {
  createDocument,
  createOpenEditorDocumentContract,
  validateDocument,
  type BlockSpec,
  type OpenEditorValueSchema,
  type ProseMirrorNode,
} from "@openeditor/core";
import { validateOpenEditorEngineDocument } from "@openeditor/embedded-runtime";
import {
  defaultBlockSpecs,
  defaultDocumentContract,
  defaultMarkContractSpecs,
  defaultNodeSpecs,
} from "@openeditor/extensions";

export * from "./page-projection";
export * from "./portable-export";

const text = (maxLength: number): OpenEditorValueSchema => ({
  type: "string",
  maxLength,
});
const identifier: OpenEditorValueSchema = {
  type: "string",
  minLength: 1,
  maxLength: 200,
};

const tabSchema: OpenEditorValueSchema = {
  type: "object",
  properties: {
    id: identifier,
    label: text(500),
    document: {
      type: "object",
      additionalProperties: true,
      validate: (value) => {
        const result = validateBaseBlocksNestedDocument(value);
        return result.valid
          ? null
          : result.issues
              .slice(0, 10)
              .map(
                (issue) =>
                  `Nested tab document ${issue.path}: ${issue.message}`,
              );
      },
    },
  },
  required: ["id", "label", "document"],
  additionalProperties: false,
};

/** Page Tabs is a page-level BaseBlocks container, not an installable block. */
export const pageTabsBlockSpec: BlockSpec = {
  name: "baseblocks.pageTabs",
  nodeType: "baseblocksPageTabs",
  label: "Page Tabs",
  group: "structure",
  defaultNode: () => ({
    type: "baseblocksPageTabs",
    attrs: {
      tabs: {
        tabs: [
          {
            id: "default",
            label: "Tab 1",
            document: createDocument([{ type: "paragraph" }]),
          },
        ],
      },
    },
  }),
  support: { web: "supported", native: "unsupported" },
  schema: {
    attributes: {
      properties: {
        tabs: {
          type: "object",
          properties: {
            tabs: {
              type: "array",
              items: tabSchema,
              minItems: 1,
              maxItems: 100,
              validate: (value) => {
                if (!Array.isArray(value)) return null;
                const ids = value.flatMap((item) =>
                  item &&
                  typeof item === "object" &&
                  !Array.isArray(item) &&
                  typeof (item as { id?: unknown }).id === "string"
                    ? [(item as { id: string }).id]
                    : [],
                );
                return new Set(ids).size === ids.length
                  ? null
                  : "Page Tab IDs must be unique.";
              },
            },
          },
          required: ["tabs"],
          additionalProperties: false,
        },
      },
      required: ["tabs"],
      additionalProperties: false,
    },
    content: false,
    text: "forbidden",
    marks: false,
  },
};

export const BASEBLOCKS_OPENEDITOR_SCHEMA_VERSION =
  "baseblocks.openeditor.custom-block.v2";

const rootTypes = [
  ...(defaultDocumentContract.rootContent?.allowedTypes ?? []),
  "baseblocksPageTabs",
] as const;

export const baseBlocksDocumentContract = createOpenEditorDocumentContract({
  schemaVersion: BASEBLOCKS_OPENEDITOR_SCHEMA_VERSION,
  rootContent: { allowedTypes: rootTypes, minItems: 1 },
  blockSpecs: [...defaultBlockSpecs, pageTabsBlockSpec],
  nodeSpecs: defaultNodeSpecs,
  markSpecs: defaultMarkContractSpecs,
});

export const validateBaseBlocksDocument = (document: unknown) => {
  const validation = validateDocument(document, {
    contract: baseBlocksDocumentContract,
    limits: { requireNodeIds: true },
  });
  if (!validation.valid) return validation;
  const content = (document as { content?: unknown }).content;
  if (
    Array.isArray(content) &&
    content.some(
      (node) =>
        node &&
        typeof node === "object" &&
        !Array.isArray(node) &&
        (node as { type?: unknown }).type === "baseblocksPageTabs",
    ) &&
    (content.length !== 1 ||
      (content[0] as { type?: unknown } | undefined)?.type !==
        "baseblocksPageTabs")
  )
    return {
      valid: false,
      issues: [
        {
          path: "$.content",
          code: "custom_validation" as const,
          message: "Page Tabs must be the only block in a page document.",
        },
      ],
    };
  return validation;
};

export function validateBaseBlocksNestedDocument(document: unknown) {
  const validation = validateBaseBlocksDocument(document);
  if (!validation.valid) return validation;
  const content = (document as { content?: unknown }).content;
  if (
    Array.isArray(content) &&
    content.some(
      (node) =>
        node &&
        typeof node === "object" &&
        !Array.isArray(node) &&
        (node as { type?: unknown }).type === "baseblocksPageTabs",
    )
  )
    return {
      valid: false,
      issues: [
        {
          path: "$.content",
          code: "custom_validation" as const,
          message: "Page Tabs cannot be nested inside another block.",
        },
      ],
    };
  return validation;
}

export const assertBaseBlocksDocument = (document: unknown): void => {
  const validation = validateBaseBlocksDocument(document);
  if (!validation.valid)
    throw new Error(
      validation.issues
        .slice(0, 20)
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("\n"),
    );
  const content = (document as { content?: unknown }).content;
  const pageTabs =
    Array.isArray(content) &&
    content.length === 1 &&
    (content[0] as { type?: unknown } | undefined)?.type ===
      "baseblocksPageTabs";
  if (pageTabs) return;
  const engineValidation = validateOpenEditorEngineDocument(
    document as ReturnType<typeof createDocument>,
  );
  if (!engineValidation.valid)
    throw new Error(
      engineValidation.diagnostics
        .map((diagnostic) => `${diagnostic.path}: ${diagnostic.message}`)
        .join("\n"),
    );
};

export type BaseBlocksCustomNode = ProseMirrorNode & {
  type: "customBlock" | "baseblocksPageTabs";
};
