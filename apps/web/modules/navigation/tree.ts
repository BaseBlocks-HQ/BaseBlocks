/**
 * Tree utilities for flattening hierarchical data and calculating drop projections
 */

import type { PageListItem } from "@baseblocks/types";

/**
 * A flattened page with depth information for rendering
 */
export interface FlattenedPage {
  id: string;
  parentId: string | null;
  depth: number;
  page: PageListItem;
}

/**
 * The projected drop target based on cursor position
 */
export interface TreeProjection {
  parentId: string | null;
  depth: number;
  overId: string;
  position: "before" | "after" | "child";
  order: number;
}

/**
 * Indentation width in pixels for each depth level
 */
export const INDENT_WIDTH = 20;

/**
 * Threshold in pixels for indent/outdent during drag
 */
export const INDENT_THRESHOLD = 20;

/**
 * Flatten a tree into a single array with depth information.
 * Only includes children of expanded nodes.
 */
export function flattenTree(
  pages: PageListItem[],
  isExpanded: (id: string) => boolean,
  parentId: string | null = null,
  depth = 0,
): FlattenedPage[] {
  const result: FlattenedPage[] = [];

  // Get pages at this level, sorted by order
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

    // Only include children if this node is expanded
    if (isExpanded(page._id)) {
      const children = flattenTree(pages, isExpanded, page._id, depth + 1);
      result.push(...children);
    }
  }

  return result;
}

/**
 * Get the maximum allowed depth for a dragged item.
 * Prevents nesting too deep by looking at what's below the drop target.
 */
function getMaxDepth(
  items: FlattenedPage[],
  overId: string,
  activeId: string,
): number {
  const overIndex = items.findIndex((item) => item.id === overId);
  if (overIndex === -1) return 0;

  const overItem = items[overIndex];
  if (!overItem) return 0;

  // Find the next item that's not a descendant of the active item
  // This determines how deep we can go
  const activeDescendants = getDescendantIds(
    items.map((i) => i.page),
    activeId,
  );
  const descendantSet = new Set(activeDescendants);

  for (let i = overIndex + 1; i < items.length; i++) {
    const item = items[i];
    if (!item || descendantSet.has(item.id)) continue;

    // The next non-descendant item limits our depth
    // We can be at most 1 level deeper than it (as its sibling or child of sibling)
    return item.depth;
  }

  // No items below, we can nest as deep as we want (within reason)
  return overItem.depth + 1;
}

/**
 * Get the minimum allowed depth for a dragged item.
 * Based on the depth of the item we're hovering over.
 */
function getMinDepth(items: FlattenedPage[], overId: string): number {
  const overIndex = items.findIndex((item) => item.id === overId);
  if (overIndex === -1) return 0;

  // Find the next item to determine minimum depth
  const nextItem = items[overIndex + 1];
  if (!nextItem) return 0;

  return 0; // Can always move to root level
}

/**
 * Calculate the projected drop position based on cursor offset.
 *
 * @param items - Flattened tree items
 * @param activeId - ID of the item being dragged
 * @param overId - ID of the item being hovered over
 * @param offsetX - Horizontal offset of the drag cursor from initial position
 * @param pages - All pages for calculating order
 */
export function getProjection(
  items: FlattenedPage[],
  activeId: string,
  overId: string,
  offsetX: number,
  pages: PageListItem[],
): TreeProjection | null {
  const overIndex = items.findIndex((item) => item.id === overId);
  const activeIndex = items.findIndex((item) => item.id === activeId);

  if (overIndex === -1 || activeIndex === -1) return null;

  const overItem = items[overIndex];
  const activeItem = items[activeIndex];
  if (!overItem || !activeItem) return null;

  // Calculate depth change based on horizontal offset
  const depthOffset = Math.round(offsetX / INDENT_WIDTH);

  // The base depth when dropping after an item is the item's depth
  const baseDepth = overItem.depth;

  // Calculate new depth with constraints
  const maxDepth = getMaxDepth(items, overId, activeId);
  const minDepth = getMinDepth(items, overId);

  // New depth is base + offset, clamped to valid range
  // Allow going one level deeper (as a child) by adding 1 to maxDepth
  const clampedDepth = Math.max(
    minDepth,
    Math.min(maxDepth + 1, baseDepth + depthOffset),
  );

  // Determine the parent based on the new depth
  let parentId: string | null = null;
  let position: "before" | "after" | "child" = "after";

  if (clampedDepth === 0) {
    // Root level
    parentId = null;
    position = "after";
  } else if (clampedDepth > overItem.depth) {
    // Nesting as a child of the over item
    parentId = overItem.id;
    position = "child";
  } else if (clampedDepth === overItem.depth) {
    // Same level as over item (sibling)
    parentId = overItem.parentId;
    position = "after";
  } else {
    // Going up in the tree - find the appropriate ancestor
    // Walk up from overItem to find the parent at the right depth
    let currentItem = overItem;
    for (
      let i = overIndex - 1;
      i >= 0 && currentItem.depth > clampedDepth;
      i--
    ) {
      const item = items[i];
      if (item && item.depth < currentItem.depth) {
        currentItem = item;
      }
    }
    parentId = currentItem.parentId;
    position = "after";
  }

  // Calculate the new order
  const order = calculateNewOrder(pages, parentId, overId, position);

  return {
    parentId,
    depth: clampedDepth,
    overId,
    position,
    order,
  };
}

/**
 * Calculate the new order value for a move operation
 */
function calculateNewOrder(
  pages: PageListItem[],
  parentId: string | null,
  overId: string,
  position: "before" | "after" | "child",
): number {
  if (position === "child") {
    // Moving as a child - get max order of existing children
    const children = pages.filter((p) => (p.parentId ?? null) === overId);
    if (children.length === 0) return 0;
    return Math.max(...children.map((c) => c.order)) + 1;
  }

  // Get siblings at the target level
  const siblings = pages
    .filter((p) => (p.parentId ?? null) === parentId)
    .sort((a, b) => a.order - b.order);

  const overIndex = siblings.findIndex((s) => s._id === overId);
  if (overIndex === -1) {
    // Not found among siblings, add at end
    return siblings.length > 0
      ? Math.max(...siblings.map((s) => s.order)) + 1
      : 0;
  }

  if (position === "before") {
    // Place before the over item
    const overOrder = siblings[overIndex]?.order ?? 0;
    const prevOrder =
      overIndex > 0 ? (siblings[overIndex - 1]?.order ?? -1) : -1;
    return (prevOrder + overOrder) / 2;
  }

  // Position is "after"
  const overOrder = siblings[overIndex]?.order ?? 0;
  const nextOrder =
    overIndex < siblings.length - 1
      ? (siblings[overIndex + 1]?.order ?? overOrder + 2)
      : overOrder + 2;
  return (overOrder + nextOrder) / 2;
}

/**
 * Check if moving dragId to targetParentId would create a circular reference.
 */
export function wouldCreateCircle(
  pages: PageListItem[],
  dragId: string,
  targetParentId: string | null,
): boolean {
  if (targetParentId === null) return false;
  if (targetParentId === dragId) return true;

  // Get all descendants of dragId
  const descendants = getDescendantIds(pages, dragId);
  return descendants.includes(targetParentId);
}

/**
 * Get all descendant IDs of a page (recursively).
 */
export function getDescendantIds(
  pages: PageListItem[],
  pageId: string,
): string[] {
  const result: string[] = [];
  const children = pages.filter((p) => p.parentId === pageId);

  for (const child of children) {
    result.push(child._id);
    result.push(...getDescendantIds(pages, child._id));
  }

  return result;
}

/**
 * Apply a move operation to the pages array (for optimistic updates).
 * Returns a new array with updated parentId and order values.
 */
export function applyMove(
  pages: PageListItem[],
  dragId: string,
  projection: TreeProjection,
): PageListItem[] {
  return pages.map((page) => {
    if (page._id === dragId) {
      return {
        ...page,
        parentId: projection.parentId ?? undefined,
        order: projection.order,
      };
    }
    return page;
  });
}

/**
 * Create a hash of page positions for comparing server vs optimistic state.
 */
export function hashPages(pages: PageListItem[]): string {
  const sorted = [...pages].sort((a, b) => a._id.localeCompare(b._id));
  return sorted
    .map((p) => `${p._id}:${p.parentId ?? "root"}:${p.order.toFixed(6)}`)
    .join("|");
}

/**
 * Check if the dragged item can be dropped at the projected location.
 */
export function isValidDrop(
  pages: PageListItem[],
  dragId: string,
  projection: TreeProjection | null,
): boolean {
  if (!projection) return false;

  // Can't drop onto itself
  if (projection.overId === dragId) return false;

  // Can't create circular reference
  if (wouldCreateCircle(pages, dragId, projection.parentId)) return false;

  return true;
}
