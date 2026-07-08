import type { DecisionTreeNode } from "@baseblocks/domain/elements";

export function createDecisionTreeNodeId() {
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function getNodeDocument(node: DecisionTreeNode): unknown[] {
  return node.document;
}

export function nodeHasContent(node: DecisionTreeNode): boolean {
  return node.document.length > 0;
}

export function insertParentForNode(
  nodes: DecisionTreeNode[],
  nodeId: string,
  parentName = "New parent",
): { nodes: DecisionTreeNode[]; parentId: string | null } {
  const targetNode = nodes.find((node) => node.id === nodeId);
  if (!targetNode) {
    return { nodes, parentId: null };
  }

  const parentId = createDecisionTreeNodeId();
  const newParentNode: DecisionTreeNode = {
    id: parentId,
    parentId: targetNode.parentId,
    name: parentName,
    order: targetNode.order,
    document: [],
  };

  const updatedNodes = nodes.map((node) =>
    node.id === nodeId ? { ...node, parentId, order: 0 } : node,
  );

  return {
    nodes: [...updatedNodes, newParentNode],
    parentId,
  };
}
