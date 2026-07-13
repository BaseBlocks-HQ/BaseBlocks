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

export function projectTree<T>(
  nodes: TreeNode<T>[],
  expanded?: ReadonlySet<string>,
  rootId: string | null = null,
): ProjectedTreeNode<T>[] {
  const ids = new Set(nodes.map((node) => node.id));
  const children = new Map<string | null, TreeNode<T>[]>();

  for (const node of nodes) {
    const parentId =
      node.parentId && ids.has(node.parentId) ? node.parentId : null;
    const siblings = children.get(parentId) ?? [];
    siblings.push(node);
    children.set(parentId, siblings);
  }

  for (const siblings of children.values()) {
    siblings.sort(compareTreeNodes);
  }

  const result: ProjectedTreeNode<T>[] = [];
  const visiting = new Set<string>();
  const visit = (parentId: string | null, depth: number) => {
    for (const node of children.get(parentId) ?? []) {
      if (visiting.has(node.id)) continue;
      visiting.add(node.id);
      const hasChildren = (children.get(node.id)?.length ?? 0) > 0;
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
