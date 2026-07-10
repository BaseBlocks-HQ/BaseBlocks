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

export function projectTree<T>(
  nodes: TreeNode<T>[],
  expanded: ReadonlySet<string>,
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
    siblings.sort(
      (a, b) => a.order - b.order || a.label.localeCompare(b.label),
    );
  }

  const result: ProjectedTreeNode<T>[] = [];
  const visiting = new Set<string>();
  const visit = (parentId: string | null, depth: number) => {
    for (const node of children.get(parentId) ?? []) {
      if (visiting.has(node.id)) continue;
      visiting.add(node.id);
      const hasChildren = (children.get(node.id)?.length ?? 0) > 0;
      result.push({ ...node, depth, hasChildren });
      if (expanded.has(node.id)) visit(node.id, depth + 1);
      visiting.delete(node.id);
    }
  };
  visit(rootId, 0);
  return result;
}

export function wouldCreateCycle<T>(
  nodes: TreeNode<T>[],
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
