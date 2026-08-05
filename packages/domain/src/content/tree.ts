export type TreeNode<T> = {
  id: string;
  parentId: string | null;
  label: string;
  order: number;
  data: T;
};

export type ProjectedTreeNode<T> = TreeNode<T> & {
  depth: number;
  hasChildren: boolean;
};

export type TreeIndex<T> = {
  byId: ReadonlyMap<string, TreeNode<T>>;
  childrenByParentId: ReadonlyMap<string | null, readonly TreeNode<T>[]>;
};

export type OrderedTreeNode = {
  id: string;
  parentId: string | null;
  order: number;
};

export type TreeDropPlacement = "before" | "after" | "inside" | "root-end";

export type TreeMove = {
  nodeId: string;
  targetId: string | null;
  placement: TreeDropPlacement;
};

export type TreeNodeUpdate = {
  id: string;
  parentId: string | null;
  order: number;
};

export type TreeMovePlan = {
  parentId: string | null;
  index: number;
  updates: TreeNodeUpdate[];
};

export class InvalidTreeMoveError extends Error {
  override name = "InvalidTreeMoveError";
}

function compareTreeNodes(left: OrderedTreeNode, right: OrderedTreeNode) {
  return left.order - right.order || left.id.localeCompare(right.id);
}

/**
 * Builds the canonical read model for a flat, parent-linked tree. Missing
 * parents are treated as roots and duplicate ids are rejected so every tree
 * consumer gets the same deterministic structure.
 */
export function indexTree<T>(nodes: readonly TreeNode<T>[]): TreeIndex<T> {
  const byId = new Map<string, TreeNode<T>>();
  for (const node of nodes) {
    if (byId.has(node.id)) {
      throw new InvalidTreeMoveError(`Duplicate tree node: ${node.id}`);
    }
    byId.set(node.id, node);
  }

  const childrenByParentId = new Map<string | null, TreeNode<T>[]>();
  for (const node of nodes) {
    const parentId =
      node.parentId && byId.has(node.parentId) ? node.parentId : null;
    const siblings = childrenByParentId.get(parentId) ?? [];
    siblings.push(node);
    childrenByParentId.set(parentId, siblings);
  }
  for (const siblings of childrenByParentId.values()) {
    siblings.sort(compareTreeNodes);
  }

  return { byId, childrenByParentId };
}

export function getTreeAncestorIds<T>(
  index: TreeIndex<T>,
  nodeId?: string | null,
): string[] {
  const ancestors: string[] = [];
  const visited = new Set<string>();
  let cursor = nodeId ? index.byId.get(nodeId) : undefined;

  while (cursor?.parentId && !visited.has(cursor.parentId)) {
    visited.add(cursor.parentId);
    ancestors.push(cursor.parentId);
    cursor = index.byId.get(cursor.parentId);
  }
  return ancestors;
}

export function getTreeDescendantIds<T>(
  index: TreeIndex<T>,
  nodeId?: string | null,
): Set<string> {
  if (!nodeId) return new Set();
  const descendants = new Set<string>([nodeId]);
  const queue = [...(index.childrenByParentId.get(nodeId) ?? [])];

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node || descendants.has(node.id)) continue;
    descendants.add(node.id);
    queue.push(...(index.childrenByParentId.get(node.id) ?? []));
  }
  return descendants;
}

export function projectTree<T>(
  nodes: readonly TreeNode<T>[],
  expanded?: ReadonlySet<string>,
  rootId: string | null = null,
): ProjectedTreeNode<T>[] {
  return projectIndexedTree(indexTree(nodes), expanded, rootId);
}

export function projectIndexedTree<T>(
  index: TreeIndex<T>,
  expanded?: ReadonlySet<string>,
  rootId: string | null = null,
): ProjectedTreeNode<T>[] {
  const { childrenByParentId } = index;

  const result: ProjectedTreeNode<T>[] = [];
  const visiting = new Set<string>();
  const visit = (parentId: string | null, depth: number) => {
    for (const node of childrenByParentId.get(parentId) ?? []) {
      if (visiting.has(node.id)) continue;
      visiting.add(node.id);
      const hasChildren = (childrenByParentId.get(node.id)?.length ?? 0) > 0;
      result.push({ ...node, depth, hasChildren });
      if (!expanded || expanded.has(node.id)) visit(node.id, depth + 1);
      visiting.delete(node.id);
    }
  };

  visit(rootId, 0);
  return result;
}

function wouldCreateCycle(
  nodes: OrderedTreeNode[],
  nodeId: string,
  parentId: string | null,
) {
  if (nodeId === parentId) return true;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  let cursor = parentId ? byId.get(parentId) : undefined;

  while (cursor && !visited.has(cursor.id)) {
    if (cursor.id === nodeId) return true;
    visited.add(cursor.id);
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
  }

  return false;
}

/**
 * Resolves one semantic tree drop into the complete set of structural writes.
 * The moved node carries its descendants because their parent links are left
 * untouched. Both affected sibling lists are normalized to dense order values.
 */
export function planTreeMove(
  nodes: OrderedTreeNode[],
  move: TreeMove,
): TreeMovePlan {
  const byId = new Map<string, OrderedTreeNode>();
  for (const node of nodes) {
    if (byId.has(node.id)) {
      throw new InvalidTreeMoveError(`Duplicate tree node: ${node.id}`);
    }
    byId.set(node.id, node);
  }

  const source = byId.get(move.nodeId);
  if (!source) throw new InvalidTreeMoveError("Source node not found");

  if (move.placement === "root-end") {
    if (move.targetId !== null) {
      throw new InvalidTreeMoveError("A root-end move cannot have a target");
    }
  } else if (!move.targetId) {
    throw new InvalidTreeMoveError("This move requires a target node");
  }

  const target = move.targetId ? byId.get(move.targetId) : undefined;
  if (move.targetId && !target) {
    throw new InvalidTreeMoveError("Target node not found");
  }
  if (target?.id === source.id) {
    throw new InvalidTreeMoveError("A node cannot be dropped on itself");
  }

  const parentId =
    move.placement === "inside"
      ? (target?.id ?? null)
      : move.placement === "root-end"
        ? null
        : (target?.parentId ?? null);

  if (wouldCreateCycle(nodes, source.id, parentId)) {
    throw new InvalidTreeMoveError(
      "A node cannot be moved inside one of its descendants",
    );
  }

  const siblingsFor = (candidateParentId: string | null) =>
    nodes
      .filter(
        (node) => node.id !== source.id && node.parentId === candidateParentId,
      )
      .sort(compareTreeNodes);

  const destinationSiblings = siblingsFor(parentId);
  let index = destinationSiblings.length;

  if (move.placement === "before" || move.placement === "after") {
    const targetIndex = destinationSiblings.findIndex(
      (node) => node.id === target?.id,
    );
    if (targetIndex === -1) {
      throw new InvalidTreeMoveError("Target is not in the destination list");
    }
    index = targetIndex + (move.placement === "after" ? 1 : 0);
  }

  destinationSiblings.splice(index, 0, {
    ...source,
    parentId,
  });

  const affectedParents = new Set<string | null>([source.parentId, parentId]);
  const updates: TreeNodeUpdate[] = [];

  for (const affectedParentId of affectedParents) {
    const siblings =
      affectedParentId === parentId
        ? destinationSiblings
        : siblingsFor(affectedParentId);

    siblings.forEach((node, order) => {
      const original = byId.get(node.id);
      if (!original) return;
      if (original.parentId !== affectedParentId || original.order !== order) {
        updates.push({ id: node.id, parentId: affectedParentId, order });
      }
    });
  }

  return { parentId, index, updates };
}
