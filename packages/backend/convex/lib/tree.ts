import type { Doc } from "../_generated/dataModel";

/**
 * A page node in the tree structure.
 * Used for both draft and published page trees.
 */
export type PageTreeNode = {
  _id: string;
  siteId: Doc<"pages">["siteId"];
  title: string;
  slug: string;
  icon?: string;
  order: number;
  parentId?: string;
  children: PageTreeNode[];
};

type ProjectedPage = {
  _id: string;
  siteId: Doc<"pages">["siteId"];
  title: string;
  slug: string;
  icon?: string;
  order: number;
  parentId?: string;
};

/**
 * Build a tree structure from a flat array of pages.
 * Shared by both getTree (draft) and getTreePublished (published).
 *
 * @param pages - Flat array of page data (already projected to the right fields)
 * @returns Root-level tree nodes with nested children, sorted by order
 */
export function buildPageTree(pages: ProjectedPage[]): PageTreeNode[] {
  const pageMap = new Map<string, PageTreeNode>();
  const rootPages: PageTreeNode[] = [];

  // First pass: create map with empty children
  for (const page of pages) {
    pageMap.set(page._id, { ...page, children: [] });
  }

  // Second pass: build tree
  for (const node of pageMap.values()) {
    if (node.parentId) {
      const parent = pageMap.get(node.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // Parent not in set (e.g., not deployed), treat as root
        rootPages.push(node);
      }
    } else {
      rootPages.push(node);
    }
  }

  // Sort children by order recursively
  sortChildren(rootPages);

  return rootPages;
}

function sortChildren(pages: PageTreeNode[]) {
  pages.sort((a, b) => a.order - b.order);
  for (const page of pages) {
    sortChildren(page.children);
  }
}
