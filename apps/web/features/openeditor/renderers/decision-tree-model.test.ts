import { describe, expect, test } from "bun:test";
import {
  removeDecisionTreeNodesFromPath,
  resolveDecisionTree,
} from "./decision-tree-model";

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

  test("discards path segments that do not belong to the active branch", () => {
    expect(resolveDecisionTree(nodes, ["root-a", "root-b"]).path).toEqual([
      "root-a",
    ]);
  });

  test("truncates navigation when an active ancestor is removed", () => {
    expect(
      removeDecisionTreeNodesFromPath(["root-a", "child"], new Set(["child"])),
    ).toEqual(["root-a"]);
  });
});
