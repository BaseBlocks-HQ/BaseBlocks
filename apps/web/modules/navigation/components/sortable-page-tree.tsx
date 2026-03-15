"use client";

import { useEditorSiteOptional } from "@/modules/shared/contexts/editor-context";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type { PageListItem } from "@baseblocks/types";
import type { DragEndEvent, UniqueIdentifier } from "@dnd-kit/core";
import { useMutation } from "convex/react";
import { IconFile, IconHouse } from "nucleo-glass";
import { useRef, useState } from "react";
import type { TreeProjection } from "../tree";
import {
  applyMove,
  flattenTree,
  hashPages,
  isValidDrop,
  removeChildrenOf,
} from "../tree";
import { PageActionsMenu } from "./page-actions-menu";
import { SortableTreeItem } from "./sortable-tree-item";
import { TreeDndProvider } from "./tree-dnd-context";

interface SortablePageTreeProps {
  pages: PageListItem[];
  allPages: PageListItem[];
  selectedPageId?: string;
  siteId: string;
  defaultPageId?: string;
  onSelect: (pageId: string) => void;
  isExpanded?: (pageId: string) => boolean;
  onToggleExpand?: (pageId: string) => void;
  onSetExpanded?: (pageId: string, expanded: boolean) => void;
}

export function SortablePageTree({
  pages: _pages,
  allPages,
  selectedPageId,
  siteId,
  defaultPageId,
  onSelect,
  isExpanded: isExpandedProp,
  onToggleExpand,
  onSetExpanded,
}: SortablePageTreeProps) {
  const editorSite = useEditorSiteOptional();
  const canEdit = editorSite?.canEdit ?? false;
  const movePage = useMutation(api.pages.mutations.move);

  const isExpanded = isExpandedProp ?? (() => false);

  // Track active drag for child exclusion during drag
  const [activeId, setActiveId] = useState<string | null>(null);

  // Optimistic update tracking
  const mutationIdRef = useRef(0);
  const [pendingMutation, setPendingMutation] = useState<{
    id: number;
    pages: PageListItem[];
  } | null>(null);

  const effectivePages = pendingMutation?.pages ?? allPages;

  // Flatten tree; during drag, remove children of dragged item
  const allFlattenedItems = flattenTree(effectivePages, isExpanded);
  const flattenedItems = activeId
    ? removeChildrenOf(allFlattenedItems, [activeId])
    : allFlattenedItems;

  // Quick lookup maps
  const hasChildrenMap = new Map<string, boolean>();
  for (const page of effectivePages) {
    const has = effectivePages.some((p) => p.parentId === page._id);
    hasChildrenMap.set(page._id, has);
  }

  if (
    pendingMutation &&
    hashPages(allPages) === hashPages(pendingMutation.pages)
  ) {
    setPendingMutation(null);
  }

  // ---- Drag handlers ----

  const handleDragStart = (event: { active: { id: UniqueIdentifier } }) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (
    event: DragEndEvent,
    projection: TreeProjection | null,
  ) => {
    setActiveId(null);

    if (
      !projection ||
      !isValidDrop(effectivePages, String(event.active.id), projection)
    ) {
      return;
    }

    // Optimistic update
    const newPages = applyMove(
      effectivePages,
      String(event.active.id),
      projection,
    );
    const mutationId = ++mutationIdRef.current;
    setPendingMutation({ id: mutationId, pages: newPages });

    // Auto-expand parent when nesting
    if (projection.position === "child" && projection.overId) {
      onSetExpanded?.(projection.overId, true);
    }

    // Persist to backend — convert null parentId to undefined for Convex
    const newParentId = projection.parentId
      ? (projection.parentId as Id<"pages">)
      : undefined;

    try {
      await movePage({
        pageId: event.active.id as Id<"pages">,
        newParentId,
        newOrder: projection.order,
      });
    } catch {
      if (pendingMutation?.id === mutationId) {
        setPendingMutation(null);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  if (flattenedItems.length === 0) return null;

  return (
    <TreeDndProvider
      items={flattenedItems}
      pages={effectivePages}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      isExpanded={isExpanded}
      hasChildren={(id) => hasChildrenMap.get(id) ?? false}
      onAutoExpand={(id) => onSetExpanded?.(id, true)}
      renderOverlay={(id) => {
        const page = effectivePages.find((p) => p._id === String(id));
        if (!page) return null;
        return (
          <div className="flex items-center gap-2 rounded-md bg-background border shadow-lg px-3 py-1.5 text-sm cursor-grabbing">
            {page._id === defaultPageId ? (
              <IconHouse className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <IconFile className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate max-w-48">{page.title}</span>
          </div>
        );
      }}
    >
      {flattenedItems.map((item) => (
        <SortableTreeItem
          key={item.id}
          item={item}
          allPages={effectivePages}
          selectedPageId={selectedPageId}
          defaultPageId={defaultPageId}
          hasChildren={hasChildrenMap.get(item.id) ?? false}
          isExpanded={isExpanded(item.id)}
          canEdit={canEdit}
          onSelect={onSelect}
          onToggleExpand={() => onToggleExpand?.(item.id)}
          actionsMenu={
            canEdit ? (
              <PageActionsMenu
                page={item.page}
                siteId={siteId}
                isDefault={defaultPageId === item.page._id}
                onExpandParent={() => onSetExpanded?.(item.id, true)}
              />
            ) : null
          }
        />
      ))}
    </TreeDndProvider>
  );
}
