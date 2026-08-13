import { describe, expect, test } from "bun:test";
import {
  previousDecisionTreePath,
  removeDecisionTreeNodesFromPath,
  reorderDecisionTreeSiblings,
  resolveDecisionTree,
} from "./decision-tree-navigation";

const nodes = [
  { id: "root-b", parentId: null, order: 1 },
  { id: "root-a", parentId: null, order: 0 },
  { id: "child", parentId: "root-a", order: 0 },
];

describe("decision tree navigation", () => {
  test("uses one path for the active node and visible options", () => {
    expect(resolveDecisionTree(nodes, [])).toEqual({
      activeNode: null,
      path: [],
      visibleOptions: [nodes[1], nodes[0]],
    });
    expect(resolveDecisionTree(nodes, ["root-a"])).toEqual({
      activeNode: nodes[1],
      path: ["root-a"],
      visibleOptions: [nodes[2]],
    });
  });

  test("repairs a path after branch changes", () => {
    expect(resolveDecisionTree(nodes, ["root-a", "root-b"]).path).toEqual([
      "root-a",
    ]);
    expect(
      removeDecisionTreeNodesFromPath(["root-a", "child"], new Set(["child"])),
    ).toEqual(["root-a"]);
  });

  test("moves back exactly one level, including at the root", () => {
    expect(previousDecisionTreePath(["root-a", "child"])).toEqual(["root-a"]);
    expect(previousDecisionTreePath(["root-a"])).toEqual([]);
    expect(previousDecisionTreePath([])).toEqual([]);
  });
});

describe("decision tree ordering", () => {
  test("reorders only the selected group of siblings", () => {
    const nodes = [
      { id: "root-a", parentId: null, order: 0 },
      { id: "root-b", parentId: null, order: 1 },
      { id: "root-c", parentId: null, order: 2 },
      { id: "child-a", parentId: "root-a", order: 0 },
    ];

    const reordered = reorderDecisionTreeSiblings(
      nodes,
      null,
      "root-c",
      "root-a",
    );

    expect(resolveDecisionTree(reordered, []).visibleOptions).toEqual([
      { id: "root-c", parentId: null, order: 0 },
      { id: "root-a", parentId: null, order: 1 },
      { id: "root-b", parentId: null, order: 2 },
    ]);
    expect(reordered.find((node) => node.id === "child-a")?.order).toBe(0);
  });
});
