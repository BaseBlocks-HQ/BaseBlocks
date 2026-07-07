import type { PageListItem } from "@baseblocks/types";
import type { TreeProjection } from "./types";

/** Check if the dragged item can be dropped at the projected location. */
export function isValidDrop(
  pages: PageListItem[],
  dragId: string,
  projection: TreeProjection | null,
): boolean {
  if (!projection) return false;
  return !wouldCreateCircle(pages, dragId, projection.parentId);
}

/** Check if moving dragId to targetParentId would create a circular reference. */
function wouldCreateCircle(
  pages: PageListItem[],
  dragId: string,
  targetParentId: string | null,
): boolean {
  if (targetParentId === null) return false;
  if (targetParentId === dragId) return true;
  return getDescendantIds(pages, dragId).includes(targetParentId);
}

/** Get all descendant IDs of a page (recursively). */
function getDescendantIds(pages: PageListItem[], pageId: string): string[] {
  const result: string[] = [];
  for (const page of pages) {
    if (page.parentId === pageId) {
      result.push(page._id);
      result.push(...getDescendantIds(pages, page._id));
    }
  }
  return result;
}
