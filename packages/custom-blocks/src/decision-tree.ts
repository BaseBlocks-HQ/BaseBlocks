import type { OpenEditorDocument } from "@openeditor/custom-block";
import { validateDocument } from "@openeditor/core";

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

const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Decision Tree data must be an object.");
  return value as Record<string, unknown>;
};

export function parseDecisionTreeValue(value: unknown): DecisionTreeValue {
  const root = object(value);
  if (root.tabsMode !== "row" && root.tabsMode !== "dropdown")
    throw new Error("Decision Tree tabs mode is invalid.");
  if (!Array.isArray(root.trees) || root.trees.length < 1)
    throw new Error("Decision Tree data must contain at least one tree.");
  const treeIds = new Set<string>();
  const trees = root.trees.map((treeValue) => {
    const tree = object(treeValue);
    if (typeof tree.id !== "string" || !tree.id)
      throw new Error("Each decision tree needs an ID.");
    if (treeIds.has(tree.id))
      throw new Error("Decision tree IDs must be unique.");
    treeIds.add(tree.id);
    if (typeof tree.label !== "string")
      throw new Error("Each decision tree needs a label.");
    if (!Array.isArray(tree.nodes))
      throw new Error("Decision tree nodes must be an array.");
    const nodeIds = new Set<string>();
    const nodes = tree.nodes.map((nodeValue) => {
      const node = object(nodeValue);
      if (typeof node.id !== "string" || !node.id)
        throw new Error("Each decision node needs an ID.");
      if (nodeIds.has(node.id))
        throw new Error("Decision node IDs must be unique.");
      nodeIds.add(node.id);
      if (node.parentId !== null && typeof node.parentId !== "string")
        throw new Error("Decision node parent IDs are invalid.");
      if (typeof node.name !== "string" || !node.name.trim())
        throw new Error("Each decision node needs a name.");
      if (!Number.isSafeInteger(node.order) || Number(node.order) < 0)
        throw new Error("Decision node order must be a nonnegative integer.");
      const document = node.document as OpenEditorDocument;
      const documentResult = validateDocument(document);
      if (!documentResult.valid)
        throw new Error(
          "Decision node context must be a valid OpenEditor document.",
        );
      return {
        id: node.id,
        parentId: node.parentId as string | null,
        name: node.name,
        order: Number(node.order),
        document,
      };
    });
    for (const node of nodes)
      if (node.parentId !== null && !nodeIds.has(node.parentId))
        throw new Error("Decision node parents must exist in the same tree.");
    for (const node of nodes) {
      const seen = new Set<string>();
      let current: DecisionNode | undefined = node;
      while (current?.parentId) {
        if (seen.has(current.id))
          throw new Error("Decision node parents must be acyclic.");
        seen.add(current.id);
        current = nodes.find(({ id }) => id === current?.parentId);
      }
    }
    const siblingOrders = new Set<string>();
    for (const node of nodes) {
      const key = `${node.parentId ?? "root"}:${node.order}`;
      if (siblingOrders.has(key))
        throw new Error("Sibling decision nodes must have unique orders.");
      siblingOrders.add(key);
    }
    return { id: tree.id, label: tree.label, nodes };
  });
  return { trees, tabsMode: root.tabsMode };
}

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

export function duplicateDecisionTree(
  value: DecisionTreeValue,
  treeId: string,
  createId: () => string,
): { value: DecisionTreeValue; activeId: string } {
  const source = value.trees.find(({ id }) => id === treeId);
  if (!source) return { value, activeId: treeId };
  const nodeIds = new Map(source.nodes.map((node) => [node.id, createId()]));
  const id = createId();
  const tree: DecisionTree = {
    id,
    label: `${source.label} copy`,
    nodes: source.nodes.map((node) => ({
      ...node,
      id: nodeIds.get(node.id)!,
      parentId: node.parentId ? (nodeIds.get(node.parentId) ?? null) : null,
    })),
  };
  return {
    value: { ...value, trees: [...value.trees, tree] },
    activeId: id,
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
