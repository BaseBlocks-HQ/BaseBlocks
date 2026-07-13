import { describe, expect, test } from "bun:test";
import {
  removeDecisionTreeNodesFromPath,
  resolveDecisionTreeEditor,
} from "./editor-model";

const nodes = [
  { id: "branch", parentId: null, order: 1 },
  { id: "root-first", parentId: null, order: 0 },
  { id: "leaf", parentId: "branch", order: 0 },
  { id: "grandchild", parentId: "leaf", order: 0 },
];

describe("decision tree editor model", () => {
  test("derives the root options when no option is open", () => {
    const state = resolveDecisionTreeEditor(nodes, []);

    expect(state.activeNode).toBeNull();
    expect(state.visibleOptions.map((node) => node.id)).toEqual([
      "root-first",
      "branch",
    ]);
  });

  test("opening an option activates its content and reveals its children", () => {
    const state = resolveDecisionTreeEditor(nodes, ["branch"]);

    expect(state.activeNode?.id).toBe("branch");
    expect(state.visibleOptions.map((node) => node.id)).toEqual(["leaf"]);
  });

  test("a leaf uses the same open interaction and has an empty child list", () => {
    const state = resolveDecisionTreeEditor(nodes, [
      "branch",
      "leaf",
      "grandchild",
    ]);

    expect(state.activeNode?.id).toBe("grandchild");
    expect(state.visibleOptions).toEqual([]);
  });

  test("rejects a path that skips the tree hierarchy", () => {
    const state = resolveDecisionTreeEditor(nodes, ["leaf"]);

    expect(state.path).toEqual([]);
    expect(state.activeNode).toBeNull();
  });

  test("removing an ancestor trims the path at that ancestor", () => {
    expect(
      removeDecisionTreeNodesFromPath(
        ["branch", "leaf", "grandchild"],
        new Set(["leaf", "grandchild"]),
      ),
    ).toEqual(["branch"]);
  });
});
