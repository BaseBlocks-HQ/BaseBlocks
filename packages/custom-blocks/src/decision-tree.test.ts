import { describe, expect, test } from "bun:test";
import type { OpenEditorDocument } from "@openeditor/core";
import {
  addDecisionNode,
  addDecisionTree,
  deleteDecisionNode,
  deleteDecisionTree,
  duplicateDecisionTree,
  renameDecisionTree,
  reorderDecisionTrees,
  updateDecisionDocument,
  type DecisionTree,
  type DecisionTreeValue,
} from "./decision-tree";

const document = (id: string) =>
  ({
    type: "doc",
    version: 1,
    content: [
      { type: "paragraph", attrs: { "openeditor-id": id }, content: [] },
    ],
  }) as OpenEditorDocument;

describe("decision tree collections", () => {
  const value: DecisionTreeValue = {
    tabsMode: "row",
    trees: [{ id: "one", label: "First", nodes: [] }],
  };

  test("creates, renames, switches to, and deletes trees", () => {
    const added = addDecisionTree(value, "two");
    expect(added.activeId).toBe("two");
    expect(added.value.trees[1]).toEqual({
      id: "two",
      label: "Tree 2",
      nodes: [],
    });
    const renamed = renameDecisionTree(added.value, "two", "Support");
    expect(renamed.trees[1]?.label).toBe("Support");
    expect(deleteDecisionTree(renamed, "two")).toEqual({
      value,
      activeId: "one",
    });
  });

  test("duplicates a tree with independent node IDs", () => {
    const source: DecisionTreeValue = {
      tabsMode: "dropdown",
      trees: [
        {
          id: "one",
          label: "Support",
          nodes: [
            {
              id: "root",
              parentId: null,
              name: "Start",
              order: 0,
              document: document("root-document"),
            },
            {
              id: "child",
              parentId: "root",
              name: "Answer",
              order: 0,
              document: document("child-document"),
            },
          ],
        },
      ],
    };
    const ids = ["root-copy", "child-copy", "tree-copy"];
    const duplicated = duplicateDecisionTree(source, "one", () => ids.shift()!);
    expect(duplicated.activeId).toBe("tree-copy");
    expect(duplicated.value.trees[1]).toMatchObject({
      id: "tree-copy",
      label: "Support copy",
      nodes: [
        { id: "root-copy", parentId: null },
        { id: "child-copy", parentId: "root-copy" },
      ],
    });
  });

  test("reorders trees by stable IDs", () => {
    const value: DecisionTreeValue = {
      tabsMode: "row",
      trees: [
        { id: "one", label: "One", nodes: [] },
        { id: "two", label: "Two", nodes: [] },
        { id: "three", label: "Three", nodes: [] },
      ],
    };
    expect(
      reorderDecisionTrees(value, "three", "one").trees.map(({ id }) => id),
    ).toEqual(["three", "one", "two"]);
  });
});

describe("nested decisions", () => {
  const tree: DecisionTree = { id: "tree", label: "Tree", nodes: [] };

  test("adds ordered root and nested questions with rich documents", () => {
    const first = addDecisionNode(tree, {
      id: "a",
      name: "  Account  ",
      parentId: null,
      document: document("doc-a"),
    });
    const second = addDecisionNode(first, {
      id: "b",
      name: "Billing",
      parentId: null,
      document: document("doc-b"),
    });
    const nested = addDecisionNode(second, {
      id: "child",
      name: "Invoice",
      parentId: "a",
      document: document("doc-child"),
    });
    expect(
      nested.nodes.map(({ id, parentId, order }) => ({ id, parentId, order })),
    ).toEqual([
      { id: "a", parentId: null, order: 0 },
      { id: "b", parentId: null, order: 1 },
      { id: "child", parentId: "a", order: 0 },
    ]);
  });

  test("deletes a branch and all descendants", () => {
    const populated: DecisionTree = {
      ...tree,
      nodes: [
        {
          id: "a",
          parentId: null,
          name: "A",
          order: 0,
          document: document("a"),
        },
        {
          id: "b",
          parentId: "a",
          name: "B",
          order: 0,
          document: document("b"),
        },
        {
          id: "c",
          parentId: "b",
          name: "C",
          order: 0,
          document: document("c"),
        },
        {
          id: "other",
          parentId: null,
          name: "Other",
          order: 1,
          document: document("other"),
        },
      ],
    };
    const result = deleteDecisionNode(populated, "a");
    expect([...result.removed]).toEqual(["a", "b", "c"]);
    expect(result.tree.nodes.map(({ id }) => id)).toEqual(["other"]);
  });

  test("replaces only the selected nested rich document", () => {
    const next = document("new");
    const populated = addDecisionNode(tree, {
      id: "a",
      name: "A",
      parentId: null,
      document: document("old"),
    });
    expect(
      updateDecisionDocument(populated, "a", next).nodes[0]?.document,
    ).toBe(next);
  });
});
