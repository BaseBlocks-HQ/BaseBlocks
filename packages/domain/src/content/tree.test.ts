import { describe, expect, test } from "bun:test";
import {
  getTreeAncestorIds,
  getTreeDescendantIds,
  indexTree,
  projectIndexedTree,
  projectTree,
  type TreeNode,
} from "./tree";

const nodes: TreeNode<string>[] = [
  {
    id: "grandchild",
    parentId: "child",
    label: "Grandchild",
    order: 0,
    data: "grandchild",
  },
  { id: "root-b", parentId: null, label: "Root B", order: 1, data: "root-b" },
  { id: "child", parentId: "root-a", label: "Child", order: 0, data: "child" },
  { id: "root-a", parentId: null, label: "Root A", order: 0, data: "root-a" },
  {
    id: "orphan",
    parentId: "missing",
    label: "Orphan",
    order: 2,
    data: "orphan",
  },
];

describe("tree read model", () => {
  test("indexes deterministic siblings and promotes missing parents", () => {
    const index = indexTree(nodes);
    expect(index.childrenByParentId.get(null)?.map((node) => node.id)).toEqual([
      "root-a",
      "root-b",
      "orphan",
    ]);
    expect(
      index.childrenByParentId.get("root-a")?.map((node) => node.id),
    ).toEqual(["child"]);
  });

  test("resolves ancestors from nearest to furthest", () => {
    expect(getTreeAncestorIds(indexTree(nodes), "grandchild")).toEqual([
      "child",
      "root-a",
    ]);
  });

  test("resolves a complete subtree including its root", () => {
    expect([...getTreeDescendantIds(indexTree(nodes), "root-a")]).toEqual([
      "root-a",
      "child",
      "grandchild",
    ]);
  });

  test("projects only descendants of expanded branches", () => {
    expect(
      projectTree(nodes, new Set(["root-a"])).map((node) => node.id),
    ).toEqual(["root-a", "child", "root-b", "orphan"]);
  });

  test("projects from a reusable index without rebuilding tree state", () => {
    expect(
      projectIndexedTree(indexTree(nodes), new Set(["root-a", "child"])).map(
        (node) => node.id,
      ),
    ).toEqual(["root-a", "child", "grandchild", "root-b", "orphan"]);
  });
});
