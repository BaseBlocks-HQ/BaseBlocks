import type { OpenEditorDocument } from "@openeditor/custom-block";

export type DecisionNode = {
  id: string;
  parentId: string | null;
  name: string;
  order: number;
  document: OpenEditorDocument;
};

export type DecisionTree = {
  id: string;
  label: string;
  nodes: DecisionNode[];
};

export type DecisionTreeValue = {
  trees: DecisionTree[];
  tabsMode: "row" | "dropdown";
};

export function addDecisionTree(
  value: DecisionTreeValue,
  id: string,
): { value: DecisionTreeValue; activeId: string } {
  const tree: DecisionTree = {
    id,
    label: `Tree ${value.trees.length + 1}`,
    nodes: [],
  };
  return { value: { ...value, trees: [...value.trees, tree] }, activeId: id };
}

export function renameDecisionTree(
  value: DecisionTreeValue,
  treeId: string,
  label: string,
): DecisionTreeValue {
  return {
    ...value,
    trees: value.trees.map((tree) =>
      tree.id === treeId ? { ...tree, label } : tree,
    ),
  };
}

export function deleteDecisionTree(
  value: DecisionTreeValue,
  treeId: string,
): { value: DecisionTreeValue; activeId: string } {
  if (value.trees.length <= 1)
    return { value, activeId: value.trees[0]?.id ?? treeId };
  const index = value.trees.findIndex(({ id }) => id === treeId);
  if (index < 0) return { value, activeId: value.trees[0]?.id ?? "" };
  const trees = value.trees.filter(({ id }) => id !== treeId);
  return {
    value: { ...value, trees },
    activeId: trees[Math.min(index, trees.length - 1)]?.id ?? "",
  };
}

export function updateDecisionTree(
  value: DecisionTreeValue,
  next: DecisionTree,
): DecisionTreeValue {
  return {
    ...value,
    trees: value.trees.map((tree) => (tree.id === next.id ? next : tree)),
  };
}

export function addDecisionNode(
  tree: DecisionTree,
  input: {
    id: string;
    name: string;
    parentId: string | null;
    document: OpenEditorDocument;
  },
): DecisionTree {
  const name = input.name.trim();
  if (!name) return tree;
  const order = tree.nodes.filter(
    ({ parentId }) => parentId === input.parentId,
  ).length;
  return {
    ...tree,
    nodes: [...tree.nodes, { ...input, name, order }],
  };
}

export function decisionDescendants(
  nodes: readonly DecisionNode[],
  id: string,
): Set<string> {
  const result = new Set([id]);
  let size = 0;
  while (size !== result.size) {
    size = result.size;
    for (const node of nodes)
      if (node.parentId && result.has(node.parentId)) result.add(node.id);
  }
  return result;
}

export function deleteDecisionNode(
  tree: DecisionTree,
  id: string,
): { tree: DecisionTree; removed: Set<string> } {
  const removed = decisionDescendants(tree.nodes, id);
  if (!tree.nodes.some((node) => removed.has(node.id)))
    return { tree, removed: new Set() };
  return {
    tree: {
      ...tree,
      nodes: tree.nodes.filter((node) => !removed.has(node.id)),
    },
    removed,
  };
}

export function updateDecisionDocument(
  tree: DecisionTree,
  nodeId: string,
  document: OpenEditorDocument,
): DecisionTree {
  return {
    ...tree,
    nodes: tree.nodes.map((node) =>
      node.id === nodeId ? { ...node, document } : node,
    ),
  };
}
