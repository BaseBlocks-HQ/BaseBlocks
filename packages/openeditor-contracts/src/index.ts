import {
  createDocument,
  createOpenEditorDocumentContract,
  validateDocument,
  type BlockSpec,
  type OpenEditorValueSchema,
  type ProseMirrorNode,
} from "@openeditor/core";
import { createOpenEditorEngineExtensions } from "@openeditor/embedded-runtime";
import {
  defaultBlockSpecs,
  defaultDocumentContract as openEditorDefaultDocumentContract,
  defaultMarkContractSpecs,
  defaultNodeSpecs,
} from "@openeditor/extensions";
import {
  defineOpenEditorTiptapNode,
  validateOpenEditorTiptapDocument,
  type OpenEditorTiptapBlock,
} from "@openeditor/tiptap";

const string = (maxLength: number): OpenEditorValueSchema => ({
  type: "string",
  maxLength,
});
const identifier = (nullable = false): OpenEditorValueSchema => ({
  type: "string",
  minLength: 1,
  maxLength: 200,
  ...(nullable ? { nullable: true } : {}),
});
const attributes = (
  properties: Readonly<Record<string, OpenEditorValueSchema>>,
  required: readonly string[],
) => ({ properties, required, additionalProperties: false as const });

const uniqueStrings = (values: readonly string[], label: string) => {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return `Duplicate ${label} "${value}".`;
    seen.add(value);
  }
  return null;
};

const quickLinkSchema: OpenEditorValueSchema = {
  type: "object",
  properties: {
    id: identifier(),
    title: string(500),
    url: string(4_096),
    imageUrl: string(4_096),
    linkType: { type: "string", enum: ["website", "app"] },
  },
  required: ["id", "title", "url"],
  additionalProperties: false,
  validate: (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return null;
    const candidate = value as { linkType?: unknown; url?: unknown };
    if (typeof candidate.url !== "string" || !candidate.url.trim())
      return "Quick-link URL cannot be empty.";
    const url = candidate.url.trim();
    if (candidate.linkType === "app") {
      return /^[a-z][a-z\d+.-]*:\/\//i.test(url) &&
        !/^(?:javascript|data|vbscript):/i.test(url)
        ? null
        : "App quick links require a safe absolute URL.";
    }
    if (url.startsWith("/") && !url.startsWith("//")) return null;
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" || parsed.protocol === "http:"
        ? null
        : "Website quick links require an HTTP(S) or site-relative URL.";
    } catch {
      return "Website quick links require an HTTP(S) or site-relative URL.";
    }
  },
};

const directoryRowSchema: OpenEditorValueSchema = {
  type: "object",
  properties: {
    id: identifier(),
    cells: {
      type: "object",
      additionalProperties: string(20_000),
    },
  },
  required: ["id", "cells"],
  additionalProperties: false,
};

const directorySchema: OpenEditorValueSchema = {
  type: "object",
  properties: {
    id: identifier(),
    label: string(500),
    columnIds: {
      type: "array",
      items: identifier(),
      minItems: 1,
      maxItems: 100,
    },
    rows: { type: "array", items: directoryRowSchema, maxItems: 10_000 },
    pageSize: {
      type: "number",
      nullable: true,
      integer: true,
      minimum: 1,
      maximum: 10_000,
    },
  },
  required: ["id", "label", "columnIds", "rows", "pageSize"],
  additionalProperties: false,
  validate: (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return null;
    const directory = value as {
      columnIds?: unknown;
      rows?: unknown;
    };
    if (!Array.isArray(directory.columnIds)) return null;
    const columnIds = directory.columnIds.filter(
      (item): item is string => typeof item === "string",
    );
    const duplicateColumn = uniqueStrings(columnIds, "directory column ID");
    if (duplicateColumn) return duplicateColumn;
    if (!Array.isArray(directory.rows)) return null;
    const rowIds: string[] = [];
    const columns = new Set(columnIds);
    for (const row of directory.rows) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const candidate = row as { id?: unknown; cells?: unknown };
      if (typeof candidate.id === "string") rowIds.push(candidate.id);
      if (
        !candidate.cells ||
        typeof candidate.cells !== "object" ||
        Array.isArray(candidate.cells)
      )
        continue;
      for (const cellId of Object.keys(candidate.cells)) {
        if (!columns.has(cellId))
          return `Directory row references unknown column "${cellId}".`;
      }
    }
    return uniqueStrings(rowIds, "directory row ID");
  },
};

const decisionDocumentSchema: OpenEditorValueSchema = {
  type: "object",
  additionalProperties: true,
  validate: (value) => {
    const result = validateDocument(value, {
      contract: defaultDocumentContract,
      limits: { requireNodeIds: true },
    });
    return result.valid
      ? null
      : result.issues
          .slice(0, 10)
          .map(
            (issue) =>
              `Nested decision document ${issue.path}: ${issue.message}`,
          );
  },
};

const decisionNodeSchema: OpenEditorValueSchema = {
  type: "object",
  properties: {
    id: identifier(),
    parentId: identifier(true),
    name: string(500),
    order: { type: "number", integer: true, minimum: 0 },
    document: decisionDocumentSchema,
  },
  required: ["id", "parentId", "name", "order", "document"],
  additionalProperties: false,
};

const decisionTreeSchema: OpenEditorValueSchema = {
  type: "object",
  properties: {
    id: identifier(),
    label: string(500),
    nodes: { type: "array", items: decisionNodeSchema, maxItems: 5_000 },
  },
  required: ["id", "label", "nodes"],
  additionalProperties: false,
  validate: (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return null;
    const nodes = (value as { nodes?: unknown }).nodes;
    if (!Array.isArray(nodes)) return null;
    const validNodes = nodes.flatMap((node) => {
      if (!node || typeof node !== "object" || Array.isArray(node)) return [];
      const candidate = node as {
        id?: unknown;
        parentId?: unknown;
        order?: unknown;
      };
      return typeof candidate.id === "string" ? [candidate] : [];
    });
    const ids = validNodes.map((node) => node.id as string);
    const duplicate = uniqueStrings(ids, "decision node ID");
    if (duplicate) return duplicate;
    const idSet = new Set(ids);
    const parentById = new Map<string, string | null>();
    const orderKeys: string[] = [];
    for (const node of validNodes) {
      const id = node.id as string;
      const parentId = typeof node.parentId === "string" ? node.parentId : null;
      if (parentId && !idSet.has(parentId)) {
        return `Decision node "${id}" references missing parent "${parentId}".`;
      }
      parentById.set(id, parentId);
      orderKeys.push(`${parentId ?? "root"}:${String(node.order)}`);
    }
    const duplicateOrder = uniqueStrings(orderKeys, "decision sibling order");
    if (duplicateOrder) return duplicateOrder;
    for (const id of ids) {
      const seen = new Set([id]);
      let parentId = parentById.get(id) ?? null;
      while (parentId) {
        if (seen.has(parentId))
          return `Decision tree contains a cycle involving "${id}".`;
        seen.add(parentId);
        parentId = parentById.get(parentId) ?? null;
      }
    }
    return null;
  },
};

const pageTabSchema: OpenEditorValueSchema = {
  type: "object",
  properties: {
    id: identifier(),
    label: string(500),
    document: {
      type: "object",
      additionalProperties: true,
      validate: (value) => {
        const result = validateDocument(value, {
          contract: baseBlocksDocumentContract,
          limits: { requireNodeIds: true },
        });
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

const block = (spec: BlockSpec): BlockSpec => spec;

export const quickLinksBlockSpec = block({
  name: "baseblocks.quickLinks",
  nodeType: "baseblocksQuickLinks",
  label: "Quick Links",
  group: "embed",
  defaultNode: () => ({ type: "baseblocksQuickLinks", attrs: { links: [] } }),
  support: { web: "supported", native: "unsupported" },
  schema: {
    attributes: attributes(
      {
        links: {
          type: "array",
          items: quickLinkSchema,
          maxItems: 200,
          validate: (value) =>
            Array.isArray(value)
              ? uniqueStrings(
                  value.flatMap((item) =>
                    item &&
                    typeof item === "object" &&
                    !Array.isArray(item) &&
                    typeof (item as { id?: unknown }).id === "string"
                      ? [(item as { id: string }).id]
                      : [],
                  ),
                  "quick-link ID",
                )
              : null,
        },
      },
      ["links"],
    ),
    content: false,
    text: "forbidden",
    marks: false,
  },
});

export const directoryBlockSpec = block({
  name: "baseblocks.directory",
  nodeType: "baseblocksDirectory",
  label: "Directory",
  group: "embed",
  defaultNode: () => ({
    type: "baseblocksDirectory",
    attrs: {
      directory: {
        directories: [
          {
            id: "default",
            label: "Directory 1",
            columnIds: ["default-column-1"],
            rows: [{ id: "default-row-1", cells: { "default-column-1": "" } }],
            pageSize: null,
          },
        ],
      },
    },
  }),
  support: { web: "supported", native: "unsupported" },
  schema: {
    attributes: attributes(
      {
        directory: {
          type: "object",
          properties: {
            directories: {
              type: "array",
              items: directorySchema,
              minItems: 1,
              maxItems: 50,
              validate: (value) =>
                Array.isArray(value)
                  ? uniqueStrings(
                      value.flatMap((item) =>
                        item &&
                        typeof item === "object" &&
                        !Array.isArray(item) &&
                        typeof (item as { id?: unknown }).id === "string"
                          ? [(item as { id: string }).id]
                          : [],
                      ),
                      "directory ID",
                    )
                  : null,
            },
          },
          required: ["directories"],
          additionalProperties: false,
        },
      },
      ["directory"],
    ),
    content: false,
    text: "forbidden",
    marks: false,
  },
});

export const searchBlockSpec = block({
  name: "baseblocks.search",
  nodeType: "baseblocksSearch",
  label: "Search",
  group: "embed",
  defaultNode: () => ({
    type: "baseblocksSearch",
    attrs: {
      search: {
        placeholder: "Search documents…",
        maxResults: 10,
        showFileType: true,
      },
    },
  }),
  support: { web: "supported", native: "unsupported" },
  schema: {
    attributes: attributes(
      {
        search: {
          type: "object",
          properties: {
            placeholder: string(500),
            maxResults: {
              type: "number",
              integer: true,
              minimum: 1,
              maximum: 50,
            },
            showFileType: { type: "boolean" },
          },
          required: ["placeholder", "maxResults", "showFileType"],
          additionalProperties: false,
        },
      },
      ["search"],
    ),
    content: false,
    text: "forbidden",
    marks: false,
  },
});

export const libraryBlockSpec = block({
  name: "baseblocks.library",
  nodeType: "baseblocksLibrary",
  label: "Library",
  group: "embed",
  defaultNode: () => ({
    type: "baseblocksLibrary",
    attrs: { library: { allowDownloads: true } },
  }),
  support: { web: "supported", native: "unsupported" },
  schema: {
    attributes: attributes(
      {
        library: {
          type: "object",
          properties: {
            libraryId: identifier(),
            allowDownloads: { type: "boolean" },
          },
          required: ["allowDownloads"],
          additionalProperties: false,
        },
      },
      ["library"],
    ),
    content: false,
    text: "forbidden",
    marks: false,
  },
});

export const decisionTreeBlockSpec = block({
  name: "baseblocks.decisionTree",
  nodeType: "baseblocksDecisionTree",
  label: "Decision Tree",
  group: "embed",
  defaultNode: () => ({
    type: "baseblocksDecisionTree",
    attrs: {
      decisionTree: {
        trees: [{ id: "default", label: "Tree 1", nodes: [] }],
        tabsMode: "row",
      },
    },
  }),
  support: { web: "supported", native: "unsupported" },
  schema: {
    attributes: attributes(
      {
        decisionTree: {
          type: "object",
          properties: {
            trees: {
              type: "array",
              items: decisionTreeSchema,
              minItems: 1,
              maxItems: 50,
              validate: (value) =>
                Array.isArray(value)
                  ? uniqueStrings(
                      value.flatMap((item) =>
                        item &&
                        typeof item === "object" &&
                        !Array.isArray(item) &&
                        typeof (item as { id?: unknown }).id === "string"
                          ? [(item as { id: string }).id]
                          : [],
                      ),
                      "decision tree ID",
                    )
                  : null,
            },
            tabsMode: { type: "string", enum: ["row", "dropdown"] },
          },
          required: ["trees", "tabsMode"],
          additionalProperties: false,
        },
      },
      ["decisionTree"],
    ),
    content: false,
    text: "forbidden",
    marks: false,
  },
});

/**
 * BaseBlocks stores page tabs as a structural wrapper around complete
 * OpenEditor documents. The tab UI opens the nested documents in separate
 * editor controllers, so this node is part of the persisted contract even
 * though it is not mounted as an inline Tiptap node.
 */
export const pageTabsBlockSpec = block({
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
    attributes: attributes(
      {
        tabs: {
          type: "object",
          properties: {
            tabs: {
              type: "array",
              items: pageTabSchema,
              minItems: 1,
              maxItems: 100,
              validate: (value) =>
                Array.isArray(value)
                  ? uniqueStrings(
                      value.flatMap((item) =>
                        item &&
                        typeof item === "object" &&
                        !Array.isArray(item) &&
                        typeof (item as { id?: unknown }).id === "string"
                          ? [(item as { id: string }).id]
                          : [],
                      ),
                      "page-tab ID",
                    )
                  : null,
            },
          },
          required: ["tabs"],
          additionalProperties: false,
        },
      },
      ["tabs"],
    ),
    content: false,
    text: "forbidden",
    marks: false,
  },
});

export const baseBlocksBlockSpecs = [
  quickLinksBlockSpec,
  directoryBlockSpec,
  searchBlockSpec,
  libraryBlockSpec,
  decisionTreeBlockSpec,
  pageTabsBlockSpec,
] as const;

export const BASEBLOCKS_OPENEDITOR_SCHEMA_VERSION = "baseblocks.openeditor.v1";

export const defaultDocumentContract = openEditorDefaultDocumentContract;

const baseBlocksRootNodeTypes = [
  ...(defaultDocumentContract.rootContent?.allowedTypes ?? []),
  ...baseBlocksBlockSpecs.map((spec) => spec.nodeType ?? spec.name),
] as const;

const baseBlocksNodeSpecs = defaultNodeSpecs.map((spec) =>
  spec.type === "column"
    ? {
        ...spec,
        content: { allowedTypes: baseBlocksRootNodeTypes, minItems: 1 },
      }
    : spec,
);

export const baseBlocksDocumentContract = createOpenEditorDocumentContract({
  schemaVersion: BASEBLOCKS_OPENEDITOR_SCHEMA_VERSION,
  rootContent: { allowedTypes: baseBlocksRootNodeTypes, minItems: 1 },
  blockSpecs: [...defaultBlockSpecs, ...baseBlocksBlockSpecs],
  nodeSpecs: baseBlocksNodeSpecs,
  markSpecs: defaultMarkContractSpecs,
});

const createDefinition = (
  blockSpec: BlockSpec,
  options: {
    defaultValue: unknown;
    attribute: string;
    tag: string;
  },
): OpenEditorTiptapBlock =>
  defineOpenEditorTiptapNode({
    block: blockSpec,
    node: {
      group: "block",
      atom: true,
      draggable: true,
      addAttributes: () => ({
        [options.attribute]: { default: options.defaultValue },
      }),
      parseHTML: () => [{ tag: options.tag }],
      renderHTML: ({ HTMLAttributes }) => [
        "section",
        { ...HTMLAttributes, [options.tag.slice("section[".length, -1)]: "" },
      ],
    },
  });

export const quickLinksDefinition = createDefinition(quickLinksBlockSpec, {
  attribute: "links",
  defaultValue: [],
  tag: "section[data-baseblocks-quick-links]",
});

export const directoryDefinition = createDefinition(directoryBlockSpec, {
  attribute: "directory",
  defaultValue: directoryBlockSpec.defaultNode().attrs?.directory,
  tag: "section[data-baseblocks-directory]",
});

export const searchDefinition = createDefinition(searchBlockSpec, {
  attribute: "search",
  defaultValue: searchBlockSpec.defaultNode().attrs?.search,
  tag: "section[data-baseblocks-search]",
});

export const libraryDefinition = createDefinition(libraryBlockSpec, {
  attribute: "library",
  defaultValue: libraryBlockSpec.defaultNode().attrs?.library,
  tag: "section[data-baseblocks-library]",
});

export const decisionTreeDefinition = createDefinition(decisionTreeBlockSpec, {
  attribute: "decisionTree",
  defaultValue: decisionTreeBlockSpec.defaultNode().attrs?.decisionTree,
  tag: "section[data-baseblocks-decision-tree]",
});

export const pageTabsDefinition = createDefinition(pageTabsBlockSpec, {
  attribute: "tabs",
  defaultValue: pageTabsBlockSpec.defaultNode().attrs?.tabs,
  tag: "section[data-baseblocks-page-tabs]",
});

export const baseBlocksDefinitions = [
  quickLinksDefinition,
  directoryDefinition,
  searchDefinition,
  libraryDefinition,
  decisionTreeDefinition,
  pageTabsDefinition,
] as const;

const baseBlocksTiptapExtensions = [
  ...createOpenEditorEngineExtensions(),
  ...baseBlocksDefinitions.map((definition) => definition.extension),
];

export const validateBaseBlocksDocument = (document: unknown) =>
  validateDocument(document, {
    contract: baseBlocksDocumentContract,
    limits: { requireNodeIds: true },
  });

export const assertBaseBlocksDocument = (document: unknown): void => {
  const validation = validateBaseBlocksDocument(document);
  if (!validation.valid) {
    throw new Error(
      validation.issues
        .slice(0, 20)
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("\n"),
    );
  }

  const tiptapValidation = validateOpenEditorTiptapDocument(
    document as ReturnType<typeof createDocument>,
    baseBlocksTiptapExtensions,
  );
  if (!tiptapValidation.valid) {
    throw new Error(
      tiptapValidation.diagnostics
        .map((diagnostic) => `${diagnostic.path}: ${diagnostic.message}`)
        .join("\n"),
    );
  }
};

export type BaseBlocksCustomNode = ProseMirrorNode & {
  type: (typeof baseBlocksBlockSpecs)[number]["nodeType"];
};
