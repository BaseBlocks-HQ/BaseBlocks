"use client";

import { ConfirmDialog } from "@/components/dialogs";
import type { TreeProjection } from "../tree";
import {
  applyMove,
  flattenTree,
  getDescendantIds,
  hashPages,
  isValidDrop,
} from "../tree";
import { useEditorContextOptional } from "@/modules/shared/contexts/editor-context";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type { PageListItem } from "@baseblocks/types";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import type { DragEndEvent, UniqueIdentifier } from "@dnd-kit/core";
import { useMutation } from "convex/react";
import { FilePlus, MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CreateSubPageDialog } from "./create-sub-page-dialog";
import { RenamePageDialog } from "./rename-page-dialog";
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
  pages,
  allPages,
  selectedPageId,
  siteId,
  defaultPageId,
  onSelect,
  isExpanded: isExpandedProp,
  onToggleExpand,
  onSetExpanded,
}: SortablePageTreeProps) {
  const editorContext = useEditorContextOptional();
  const canEdit = editorContext?.canEdit ?? false;
  const movePage = useMutation(api.pages.mutations.move);

  // Default isExpanded function if not provided
  const isExpanded = isExpandedProp ?? (() => false);

  // Mutation tracking for optimistic updates
  const mutationIdRef = useRef(0);
  const [pendingMutation, setPendingMutation] = useState<{
    id: number;
    pages: PageListItem[];
  } | null>(null);

  // Use optimistic pages if there's a pending mutation, otherwise server pages
  const effectivePages = pendingMutation?.pages ?? allPages;

  // Flatten the tree for rendering
  const flattenedItems = flattenTree(effectivePages, isExpanded);

  // Create a map for quick page lookup
  const pageMap = new Map<string, PageListItem>();
  for (const page of effectivePages) {
    pageMap.set(page._id, page);
  }

  // Check for children per page
  const hasChildrenMap = (() => {
    const map = new Map<string, boolean>();
    for (const page of effectivePages) {
      const children = effectivePages.filter((p) => p.parentId === page._id);
      map.set(page._id, children.length > 0);
    }
    return map;
  })();

  // Clear pending state when server matches expected result
  useEffect(() => {
    if (!pendingMutation) return;

    const serverHash = hashPages(allPages);
    const expectedHash = hashPages(pendingMutation.pages);

    if (serverHash === expectedHash) {
      setPendingMutation(null);
    }
  }, [allPages, pendingMutation]);

  // Handle drag end with optimistic updates
  const handleDragEnd = async (
    event: DragEndEvent,
    projection: TreeProjection | null,
  ) => {
    const { active } = event;

    if (
      !projection ||
      !isValidDrop(effectivePages, String(active.id), projection)
    ) {
      return;
    }

    // Apply optimistic update
    const newPages = applyMove(effectivePages, String(active.id), projection);
    const mutationId = ++mutationIdRef.current;
    setPendingMutation({ id: mutationId, pages: newPages });

    // Auto-expand parent if nesting into it
    if (projection.position === "child" && projection.overId) {
      onSetExpanded?.(projection.overId, true);
    }

    try {
      await movePage({
        pageId: active.id as Id<"pages">,
        newParentId: projection.parentId as Id<"pages"> | undefined,
        newOrder: projection.order,
      });
    } catch (_error) {
      // Rollback only if this mutation is still pending
      if (pendingMutation?.id === mutationId) {
        setPendingMutation(null);
      }
    }
  };

  // Collapse dragged item's children during drag
  const handleDragStart = (event: { active: { id: UniqueIdentifier } }) => {
    // Optionally collapse children of dragged item
    const draggedId = String(event.active.id);
    const _descendants = getDescendantIds(effectivePages, draggedId);
    // We could collapse here if needed, but for now we'll keep them expanded
  };

  // Callback to check if an item has children
  const hasChildren = (id: string) => hasChildrenMap.get(id) ?? false;

  // Callback for auto-expand during drag
  const handleAutoExpand = (id: string) => {
    onSetExpanded?.(id, true);
  };

  if (flattenedItems.length === 0) {
    return null;
  }

  return (
    <TreeDndProvider
      items={flattenedItems}
      pages={effectivePages}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      isExpanded={isExpanded}
      hasChildren={hasChildren}
      onAutoExpand={handleAutoExpand}
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

// PageActionsMenu component (extracted for better organization)
function PageActionsMenu({
  page,
  siteId,
  isDefault,
  onExpandParent,
}: {
  page: PageListItem;
  siteId: string;
  isDefault: boolean;
  onExpandParent?: () => void;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [subPageOpen, setSubPageOpen] = useState(false);

  const setDefaultPage = useMutation(api.sites.mutations.setDefaultPage);
  const removePage = useMutation(api.pages.mutations.remove);

  const handleSetDefault = async () => {
    await setDefaultPage({
      siteId: siteId as Id<"sites">,
      pageId: page._id as Id<"pages">,
    });
  };

  const handleDelete = async () => {
    await removePage({ pageId: page._id as Id<"pages"> });
    setDeleteOpen(false);
  };

  const handleSubPageCreated = () => {
    // Expand the parent page to show the new sub-page
    onExpandParent?.();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover/page:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setSubPageOpen(true)}>
            <FilePlus className="h-4 w-4" />
            Add Sub-page
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setRenameOpen(true)}>
            <Pencil className="h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSetDefault} disabled={isDefault}>
            <Star className="h-4 w-4" />
            {isDefault ? "Default Page" : "Set as Default"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateSubPageDialog
        siteId={siteId}
        parentId={page._id}
        parentTitle={page.title}
        open={subPageOpen}
        onOpenChange={setSubPageOpen}
        onSuccess={handleSubPageCreated}
      />

      <RenamePageDialog
        page={page}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Page"
        description={
          <>
            Are you sure you want to delete &ldquo;{page.title}&rdquo;? This
            will also delete all content and child pages. This action cannot be
            undone.
            {isDefault && (
              <span className="block mt-2 text-amber-600 dark:text-amber-400">
                This is the default page. A new default will be assigned
                automatically.
              </span>
            )}
          </>
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
