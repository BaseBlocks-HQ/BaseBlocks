/**
 * Core projection algorithm — the heart of the tree DnD system.
 *
 * Computes WHERE a dragged item will land based on the drop zone:
 *   - "inside"       → nest as child of hovered item (highlight indicator)
 *   - "before"/"after" → reorder as sibling at hovered item's depth (line indicator)
 *   - self-hover     → depth change only, for un-nesting (drag down/left past ghost)
 *
 * Before/after ALWAYS place at the over item's depth — no horizontal offset.
 * This eliminates ambiguity: lines = reorder, highlight = nest. Period.
 */

import type { PageListItem } from "@baseblocks/types";
import { DRAG_INDENT_STEP } from "./constants";
import type { DropZone, FlattenedPage, TreeProjection } from "./types";

/**
 * Determine the drop zone from pointer Y position relative to the hovered item.
 *
 * Standard items:  top 25% = before, middle 50% = inside, bottom 25% = after
 * Expanded items:  top 25% = before, rest = inside (no "after" — children are below)
 */
export function getDropZone(
  pointerY: number,
  overRect: { top: number; height: number },
  isOverExpanded: boolean,
  overHasChildren: boolean,
): DropZone {
  const { top, height } = overRect;
  const relativeY = pointerY - top;
  const threshold = Math.max(height * 0.25, 8);

  if (isOverExpanded && overHasChildren) {
    if (relativeY < threshold) return "before";
    return "inside";
  }

  if (relativeY < threshold) return "before";
  if (relativeY > height - threshold) return "after";
  return "inside";
}

/**
 * Calculate the projected drop position.
 *
 * Returns null for no-op scenarios (self-hover without depth change).
 */
export function getProjection(
  items: FlattenedPage[],
  activeId: string,
  overId: string,
  effectiveOffsetX: number,
  pages: PageListItem[],
  zone: DropZone,
): TreeProjection | null {
  const activeItem = items.find((i) => i.id === activeId);
  const overItem = items.find((i) => i.id === overId);
  if (!activeItem || !overItem) return null;

  // Self-hover: depth change only (un-nesting via drag down/left past ghost)
  if (activeId === overId) {
    return selfHoverProjection(items, activeItem, effectiveOffsetX, pages);
  }

  // Inside zone: nest as child of hovered item
  if (zone === "inside") {
    return insideProjection(activeId, overItem, pages);
  }

  // Before/after zone: reorder as sibling at the hovered item's depth
  return reorderProjection(activeId, overItem, zone, pages);
}

/** Self-hover: change depth by dragging left or down past the ghost. */
function selfHoverProjection(
  items: FlattenedPage[],
  activeItem: FlattenedPage,
  effectiveOffsetX: number,
  pages: PageListItem[],
): TreeProjection | null {
  const activeIndex = items.findIndex((i) => i.id === activeItem.id);

  const dragDepth = Math.round(effectiveOffsetX / DRAG_INDENT_STEP);
  const projectedDepth = activeItem.depth + dragDepth;

  const prev = items[activeIndex - 1];
  const next = items[activeIndex + 1];
  const maxDepth = prev ? prev.depth + 1 : 0;
  const minDepth = next ? next.depth : 0;
  const depth = Math.max(minDepth, Math.min(maxDepth, projectedDepth));

  // No-op: depth hasn't changed
  if (depth === activeItem.depth) return null;

  const parentId = findParentId(depth, prev, items, activeIndex);
  const order = calculateSiblingOrder(
    pages,
    items,
    activeIndex,
    parentId,
    depth,
    activeItem.id,
  );

  return {
    parentId,
    depth,
    overId: activeItem.id,
    position: "after",
    order,
  };
}

/** Inside zone: nest the active item as a child of the over item. */
function insideProjection(
  activeId: string,
  overItem: FlattenedPage,
  pages: PageListItem[],
): TreeProjection {
  const children = pages
    .filter((p) => (p.parentId ?? null) === overItem.id && p._id !== activeId)
    .sort((a, b) => a.order - b.order);
  const last = children[children.length - 1];

  return {
    parentId: overItem.id,
    depth: overItem.depth + 1,
    overId: overItem.id,
    position: "child",
    order: last ? last.order + 1 : 0,
  };
}

/**
 * Before/after zone: reorder as a sibling of the over item.
 * Always at the over item's depth — no horizontal offset.
 */
function reorderProjection(
  activeId: string,
  overItem: FlattenedPage,
  zone: "before" | "after",
  pages: PageListItem[],
): TreeProjection {
  const parentId = overItem.parentId;
  const overOrder = overItem.page.order;

  // Siblings at the same level (excluding the item being dragged)
  const siblings = pages
    .filter((p) => (p.parentId ?? null) === parentId && p._id !== activeId)
    .sort((a, b) => a.order - b.order);

  const idx = siblings.findIndex((p) => p._id === overItem.id);

  let order: number;
  if (idx === -1) {
    // Safety fallback — shouldn't happen in practice
    const last = siblings[siblings.length - 1];
    order = last ? last.order + 1 : 0;
  } else if (zone === "before") {
    const prev = idx > 0 ? siblings[idx - 1] : null;
    order = prev ? (prev.order + overOrder) / 2 : overOrder - 1;
  } else {
    const next = idx < siblings.length - 1 ? siblings[idx + 1] : null;
    order = next ? (overOrder + next.order) / 2 : overOrder + 1;
  }

  return {
    parentId,
    depth: overItem.depth,
    overId: overItem.id,
    position: zone,
    order,
  };
}

/** Walk backwards through the flat list to find the parent ID for a given depth. */
function findParentId(
  depth: number,
  prev: FlattenedPage | undefined,
  items: FlattenedPage[],
  activeIndex: number,
): string | null {
  if (depth === 0 || !prev) return null;
  if (depth === prev.depth) return prev.parentId;
  if (depth > prev.depth) return prev.id;

  const ancestor = items
    .slice(0, activeIndex)
    .reverse()
    .find((item) => item.depth === depth - 1);
  return ancestor?.id ?? null;
}

/** Calculate fractional order among siblings (for depth-change scenarios). */
function calculateSiblingOrder(
  pages: PageListItem[],
  items: FlattenedPage[],
  activeIndex: number,
  parentId: string | null,
  depth: number,
  activeId: string,
): number {
  let prevId: string | null = null;
  for (let i = activeIndex - 1; i >= 0; i--) {
    const item = items[i];
    if (!item || item.depth < depth) break;
    if (
      item.depth === depth &&
      item.parentId === parentId &&
      item.id !== activeId
    ) {
      prevId = item.id;
      break;
    }
  }

  let nextId: string | null = null;
  for (let i = activeIndex + 1; i < items.length; i++) {
    const item = items[i];
    if (!item || item.depth < depth) break;
    if (
      item.depth === depth &&
      item.parentId === parentId &&
      item.id !== activeId
    ) {
      nextId = item.id;
      break;
    }
  }

  const prev = prevId ? pages.find((p) => p._id === prevId) : null;
  const next = nextId ? pages.find((p) => p._id === nextId) : null;

  if (!prev && !next) return 0;
  if (!prev) return next!.order - 1;
  if (!next) return prev.order + 1;
  return (prev.order + next.order) / 2;
}
