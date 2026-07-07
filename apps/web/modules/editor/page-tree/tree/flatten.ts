import type { PageListItem } from "@baseblocks/domain";
import type { FlattenedPage } from "./types";

/**
 * Flatten a tree into a depth-first array.
 * Only includes children of expanded nodes.
 */
export function flattenTree(
  pages: PageListItem[],
  isExpanded: (id: string) => boolean,
  parentId: string | null = null,
  depth = 0,
): FlattenedPage[] {
  const result: FlattenedPage[] = [];

  const levelPages = pages
    .filter((p) => (p.parentId ?? null) === parentId)
    .sort((a, b) => a.order - b.order);

  for (const page of levelPages) {
    result.push({
      id: page._id,
      parentId: page.parentId ?? null,
      depth,
      page,
    });

    if (isExpanded(page._id)) {
      result.push(...flattenTree(pages, isExpanded, page._id, depth + 1));
    }
  }

  return result;
}

/**
 * Remove all descendants of the given IDs from a flat list.
 * Prevents children of the dragged item from being drop targets during drag.
 */
export function removeChildrenOf(
  items: FlattenedPage[],
  ids: string[],
): FlattenedPage[] {
  const excluded = new Set(ids);
  return items.filter((item) => {
    if (item.parentId !== null && excluded.has(item.parentId)) {
      excluded.add(item.id);
      return false;
    }
    return true;
  });
}
