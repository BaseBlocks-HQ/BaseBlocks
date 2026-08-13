import { describe, expect, test } from "bun:test";
import { createDocument, textBlock } from "@openeditor/core";
import {
  baseBlocksBlockSpecs,
  baseBlocksDefinitions,
  assertBaseBlocksDocument,
  libraryBlockSpec,
  searchBlockSpec,
  validateBaseBlocksDocument,
} from "./index";

const documentWith = (
  node: ReturnType<(typeof baseBlocksBlockSpecs)[number]["defaultNode"]>,
) => createDocument([node]);

describe("BaseBlocks OpenEditor contract", () => {
  test("allows BaseBlocks blocks at the root and inside columns", () => {
    const document = createDocument([
      {
        type: "columns",
        content: [
          {
            type: "column",
            content: [libraryBlockSpec.defaultNode()],
          },
        ],
      },
      searchBlockSpec.defaultNode(),
    ]);

    expect(validateBaseBlocksDocument(document)).toEqual({
      valid: true,
      issues: [],
    });
    expect(() => assertBaseBlocksDocument(document)).not.toThrow();
  });

  test("accepts every custom block default", () => {
    for (const spec of baseBlocksBlockSpecs) {
      expect(
        validateBaseBlocksDocument(documentWith(spec.defaultNode())),
      ).toEqual({
        valid: true,
        issues: [],
      });
    }
  });

  test("keeps portable block specs and Tiptap definitions in lockstep", () => {
    expect(
      baseBlocksDefinitions.map((definition) => definition.block.nodeType),
    ).toEqual(baseBlocksBlockSpecs.map((spec) => spec.nodeType));
  });

  test("validates documents against the real configured Tiptap schema", () => {
    for (const spec of baseBlocksBlockSpecs) {
      expect(() =>
        assertBaseBlocksDocument(documentWith(spec.defaultNode())),
      ).not.toThrow();
    }

    const invalidStructure = createDocument([
      {
        type: "paragraph",
        content: [{ type: "paragraph" }],
      },
    ]);
    expect(() => assertBaseBlocksDocument(invalidStructure)).toThrow();
  });

  test("rejects unknown custom attributes", () => {
    const document = documentWith({
      ...baseBlocksBlockSpecs[2].defaultNode(),
      attrs: {
        search: {
          placeholder: "Search",
          maxResults: 10,
          showFileType: true,
          injected: "not allowed",
        },
      },
    });
    const validation = validateBaseBlocksDocument(document);
    expect(validation.valid).toBe(false);
    expect(
      validation.issues.some((issue) => issue.code === "unknown_attribute"),
    ).toBe(true);
  });

  test("rejects duplicate quick-link identities", () => {
    const document = documentWith({
      type: "baseblocksQuickLinks",
      attrs: {
        links: [
          { id: "same", title: "One", url: "https://one.example" },
          { id: "same", title: "Two", url: "https://two.example" },
        ],
      },
    });
    const validation = validateBaseBlocksDocument(document);
    expect(validation.valid).toBe(false);
    expect(
      validation.issues.some((issue) =>
        issue.message.includes("Duplicate quick-link ID"),
      ),
    ).toBe(true);
  });

  test("rejects unsafe quick-link protocols", () => {
    const document = documentWith({
      type: "baseblocksQuickLinks",
      attrs: {
        links: [
          {
            id: "unsafe",
            title: "Unsafe",
            url: "javascript:alert(1)",
            linkType: "website",
          },
        ],
      },
    });
    const validation = validateBaseBlocksDocument(document);
    expect(validation.valid).toBe(false);
    expect(
      validation.issues.some((issue) => issue.message.includes("HTTP(S)")),
    ).toBe(true);
  });

  test("rejects directory rows that reference undeclared columns", () => {
    const document = documentWith({
      type: "baseblocksDirectory",
      attrs: {
        directory: {
          directories: [
            {
              id: "directory",
              label: "Directory",
              columnIds: ["known"],
              rows: [{ id: "row", cells: { unknown: "value" } }],
              pageSize: null,
            },
          ],
        },
      },
    });
    const validation = validateBaseBlocksDocument(document);
    expect(validation.valid).toBe(false);
    expect(
      validation.issues.some((issue) =>
        issue.message.includes("unknown column"),
      ),
    ).toBe(true);
  });

  test("rejects missing and cyclic decision-tree parents", () => {
    const nested = createDocument([textBlock("paragraph", "Nested")]);
    const missingParent = documentWith({
      type: "baseblocksDecisionTree",
      attrs: {
        decisionTree: {
          tabsMode: "row",
          trees: [
            {
              id: "tree",
              label: "Tree",
              nodes: [
                {
                  id: "a",
                  parentId: "missing",
                  name: "A",
                  order: 0,
                  document: nested,
                },
              ],
            },
          ],
        },
      },
    });
    expect(
      validateBaseBlocksDocument(missingParent).issues.some((issue) =>
        issue.message.includes("missing parent"),
      ),
    ).toBe(true);

    const cycle = structuredClone(missingParent);
    const decisionTree = cycle.content[0]?.attrs?.decisionTree as
      | {
          trees: Array<{
            nodes: Array<{
              id: string;
              parentId: string | null;
              name: string;
              order: number;
              document: unknown;
            }>;
          }>;
        }
      | undefined;
    const tree = decisionTree?.trees[0];
    if (!tree) throw new Error("Expected decision tree fixture");
    tree.nodes = [
      { id: "a", parentId: "b", name: "A", order: 0, document: nested },
      { id: "b", parentId: "a", name: "B", order: 0, document: nested },
    ];
    expect(
      validateBaseBlocksDocument(cycle).issues.some((issue) =>
        issue.message.includes("cycle"),
      ),
    ).toBe(true);
  });

  test("validates nested decision documents against the built-in contract", () => {
    const document = documentWith({
      type: "baseblocksDecisionTree",
      attrs: {
        decisionTree: {
          tabsMode: "dropdown",
          trees: [
            {
              id: "tree",
              label: "Tree",
              nodes: [
                {
                  id: "node",
                  parentId: null,
                  name: "Node",
                  order: 0,
                  document: createDocument([{ type: "madeUpBlock" }]),
                },
              ],
            },
          ],
        },
      },
    });
    const validation = validateBaseBlocksDocument(document);
    expect(validation.valid).toBe(false);
    expect(
      validation.issues.some((issue) =>
        issue.message.includes("Unknown node type"),
      ),
    ).toBe(true);
  });

  test("bounds search and decision-tree payloads", () => {
    const search = documentWith({
      type: "baseblocksSearch",
      attrs: {
        search: { placeholder: "Search", maxResults: 51, showFileType: true },
      },
    });
    expect(validateBaseBlocksDocument(search).valid).toBe(false);

    const decisionTree = documentWith({
      type: "baseblocksDecisionTree",
      attrs: {
        decisionTree: { tabsMode: "grid", trees: [] },
      },
    });
    expect(validateBaseBlocksDocument(decisionTree).valid).toBe(false);
  });
});
