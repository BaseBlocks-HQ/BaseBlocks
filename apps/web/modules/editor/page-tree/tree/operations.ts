import type { PageListItem } from "@baseblocks/domain";
import type { TreeProjection } from "./types";

/** Apply a move operation to the pages array (for optimistic updates). */
export function applyMove(
  pages: PageListItem[],
  dragId: string,
  projection: TreeProjection,
): PageListItem[] {
  return pages.map((page) =>
    page._id === dragId
      ? {
          ...page,
          parentId: projection.parentId ?? undefined,
          order: projection.order,
        }
      : page,
  );
}

/** Create a hash of page positions for comparing server vs optimistic state. */
export function hashPages(pages: PageListItem[]): string {
  return [...pages]
    .sort((a, b) => a._id.localeCompare(b._id))
    .map((p) => `${p._id}:${p.parentId ?? "root"}:${p.order.toFixed(6)}`)
    .join("|");
}
