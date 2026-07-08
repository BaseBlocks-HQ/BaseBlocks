import type { PageListItem } from "@baseblocks/domain";

export interface FlattenedPage {
  id: string;
  parentId: string | null;
  depth: number;
  page: PageListItem;
}

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
