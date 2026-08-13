interface DecisionTreeNodeLike {
  id: string;
  parentId: string | null;
  order: number;
}

export function reorderDecisionTreeSiblings<T extends DecisionTreeNodeLike>(
  nodes: T[],
  parentId: string | null,
  sourceId: string,
  targetId: string,
) {
  const siblings = nodes
    .filter((node) => node.parentId === parentId)
    .sort((left, right) => left.order - right.order);
  const sourceIndex = siblings.findIndex((node) => node.id === sourceId);
  const targetIndex = siblings.findIndex((node) => node.id === targetId);

  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return nodes;
  }

  const reordered = [...siblings];
  const [source] = reordered.splice(sourceIndex, 1);
  if (!source) return nodes;
  reordered.splice(targetIndex, 0, source);

  const orderById = new Map(
    reordered.map((node, order) => [node.id, order] as const),
  );
  return nodes.map((node) => {
    const order = orderById.get(node.id);
    return order === undefined || order === node.order
      ? node
      : { ...node, order };
  });
}

/**
 * An option is both a content node and a branch. Opening it makes its content
 * active and reveals its children. Both edit and read-only views derive those
 * behaviors from this single path.
 */
export function resolveDecisionTree<T extends DecisionTreeNodeLike>(
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

export function previousDecisionTreePath(path: string[]) {
  return path.slice(0, -1);
}
