import { describe, expect, test } from "bun:test";
import { createOpenEditorCustomBlockNode } from "@openeditor/document";
import { baseBlocksBlockRegistry } from "./block-registry";
import {
  assertBaseBlocksDocument,
  baseBlocksDocumentContract,
  pageTabsBlockSpec,
  validateBaseBlocksDocument,
} from "./index";

const document = (...content: Array<Record<string, unknown>>) => ({
  type: "doc" as const,
  version: 1 as const,
  content,
});

describe("BaseBlocks OpenEditor contract", () => {
  test("adds only the structural Page Tabs node to OpenEditor", () => {
    expect(baseBlocksDocumentContract.nodes.has("customBlock")).toBe(true);
    expect(baseBlocksDocumentContract.nodes.has("baseblocksPageTabs")).toBe(
      true,
    );
    for (const legacy of [
      "baseblocksDirectory",
      "baseblocksDecisionTree",
      "baseblocksQuickLinks",
      "baseblocksSearch",
      "baseblocksLibrary",
    ])
      expect(baseBlocksDocumentContract.nodes.has(legacy)).toBe(false);
  });

  test("accepts all registered custom blocks through one node type", () => {
    for (const definition of baseBlocksBlockRegistry.definitions) {
      const node = createOpenEditorCustomBlockNode(
        baseBlocksBlockRegistry,
        definition.id,
        undefined,
        { instanceId: `${definition.id}-1` },
      );
      expect(validateBaseBlocksDocument(document(node)).valid).toBe(true);
      expect(() => assertBaseBlocksDocument(document(node))).not.toThrow();
    }
  });

  test("keeps Page Tabs as a page-level container", () => {
    const tabs = pageTabsBlockSpec.defaultNode();
    tabs.attrs = {
      ...tabs.attrs,
      "openeditor-id": "page-tabs-1",
      tabs: {
        tabs: [
          {
            id: "tab-1",
            label: "Tab 1",
            document: document({
              type: "paragraph",
              attrs: { "openeditor-id": "nested-paragraph-1" },
            }),
          },
        ],
      },
    };
    expect(() => assertBaseBlocksDocument(document(tabs))).not.toThrow();
  });

  test("rejects mixed and nested Page Tabs structures", () => {
    const tabs = pageTabsBlockSpec.defaultNode();
    tabs.attrs = {
      ...tabs.attrs,
      "openeditor-id": "page-tabs-1",
      tabs: {
        tabs: [
          {
            id: "tab-1",
            label: "Tab 1",
            document: document({
              ...pageTabsBlockSpec.defaultNode(),
              attrs: {
                ...pageTabsBlockSpec.defaultNode().attrs,
                "openeditor-id": "nested-tabs",
              },
            }),
          },
        ],
      },
    };
    expect(validateBaseBlocksDocument(document(tabs)).valid).toBe(false);
    expect(
      validateBaseBlocksDocument(
        document(
          {
            type: "paragraph",
            attrs: { "openeditor-id": "paragraph-1" },
          },
          {
            ...pageTabsBlockSpec.defaultNode(),
            attrs: {
              ...pageTabsBlockSpec.defaultNode().attrs,
              "openeditor-id": "page-tabs-2",
            },
          },
        ),
      ).valid,
    ).toBe(false);
  });

  test("rejects duplicate tab IDs and legacy custom node types", () => {
    const tabs = pageTabsBlockSpec.defaultNode();
    tabs.attrs = {
      ...tabs.attrs,
      "openeditor-id": "page-tabs-1",
      tabs: {
        tabs: [
          {
            id: "same",
            label: "One",
            document: document({
              type: "paragraph",
              attrs: { "openeditor-id": "p-1" },
            }),
          },
          {
            id: "same",
            label: "Two",
            document: document({
              type: "paragraph",
              attrs: { "openeditor-id": "p-2" },
            }),
          },
        ],
      },
    };
    expect(validateBaseBlocksDocument(document(tabs)).valid).toBe(false);
    expect(
      validateBaseBlocksDocument(
        document({
          type: "baseblocksDirectory",
          attrs: { "openeditor-id": "legacy-1", directory: {} },
        }),
      ).valid,
    ).toBe(false);
  });
});
