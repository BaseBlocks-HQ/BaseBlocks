interface DecisionTreeNodeLike {
  id: string;
  parentId: string | null;
  order: number;
}

/**
 * Decision tree editor interaction contract:
 *
 * An option is both a content node and a branch. Opening it makes its content
 * active and reveals its children. Keep those behaviors derived from one path;
 * do not introduce independent selection and navigation state.
 */
export function resolveDecisionTreeEditor<T extends DecisionTreeNodeLike>(
  nodes: T[],
  path: string[],
) {
  const validPath: string[] = [];
  let parentId: string | null = null;

  for (const nodeId of path) {
    const node = nodes.find(
      (candidate) => candidate.id === nodeId && candidate.parentId === parentId,
    );
    if (!node) break;
    validPath.push(node.id);
    parentId = node.id;
  }

  const activeNodeId = validPath.at(-1) ?? null;
  const activeNode = activeNodeId
    ? (nodes.find((node) => node.id === activeNodeId) ?? null)
    : null;
  const visibleOptions = nodes
    .filter((node) => node.parentId === activeNodeId)
    .sort((left, right) => left.order - right.order);

  return { activeNode, path: validPath, visibleOptions };
}

export function removeDecisionTreeNodesFromPath(
  path: string[],
  removedNodeIds: Set<string>,
) {
  const removedIndex = path.findIndex((nodeId) => removedNodeIds.has(nodeId));
  return removedIndex === -1 ? path : path.slice(0, removedIndex);
}
