"use client";

import { ConfirmDialog, RenamePageDialog } from "@/components/dialogs";
import { DndProvider, type DragEndEvent, arrayMove } from "@/components/dnd";
import { DragHandle } from "@/components/dnd";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { PageListItem } from "@/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { useMutation } from "convex/react";
import {
  FileText,
  Home,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface SortablePageTreeProps {
  pages: PageListItem[];
  allPages: PageListItem[];
  selectedPageId?: string;
  siteId: string;
  defaultPageId?: string;
  parentId?: string;
  depth?: number;
  onSelect: (pageId: string) => void;
}

export function SortablePageTree({
  pages,
  allPages,
  selectedPageId,
  siteId,
  defaultPageId,
  parentId,
  depth = 0,
  onSelect,
}: SortablePageTreeProps) {
  const reorderPage = useMutation(api.pages.mutations.reorder);

  // Optimistic state for page order
  const [optimisticOrder, setOptimisticOrder] = useState<string[] | null>(null);

  // Track previous server order to detect real changes
  const prevServerOrderRef = useRef<string>("");

  // Server-sorted pages
  const serverSortedPages = useMemo(
    () => [...pages].sort((a, b) => a.order - b.order),
    [pages],
  );

  // Reset optimistic state when server data ACTUALLY changes
  useEffect(() => {
    const serverOrderKey = serverSortedPages
      .map((p) => `${p._id}:${p.order}`)
      .join(",");

    if (serverOrderKey !== prevServerOrderRef.current) {
      prevServerOrderRef.current = serverOrderKey;
      setOptimisticOrder(null);
    }
  }, [serverSortedPages]);

  // Create a map for quick page lookup
  const pageMap = useMemo(() => {
    const map = new Map<string, PageListItem>();
    for (const page of serverSortedPages) {
      map.set(page._id, page);
    }
    return map;
  }, [serverSortedPages]);

  // Use optimistic order if available, otherwise server order
  const pageIds = optimisticOrder ?? serverSortedPages.map((p) => p._id);

  // Get sorted pages based on current order
  const sortedPages = useMemo(() => {
    return pageIds
      .map((id) => pageMap.get(id))
      .filter((p): p is PageListItem => p !== undefined);
  }, [pageIds, pageMap]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      const currentIds = pageIds;
      const oldIndex = currentIds.findIndex((id) => id === active.id);
      const newIndex = currentIds.findIndex((id) => id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      // Update optimistic state immediately
      const reorderedIds = arrayMove(currentIds, oldIndex, newIndex);
      setOptimisticOrder(reorderedIds);

      // Call reorder mutation with the full ordered list
      await reorderPage({
        siteId: siteId as Id<"sites">,
        parentId: parentId as Id<"pages"> | undefined,
        pageIds: reorderedIds as Id<"pages">[],
      });
    },
    [pageIds, reorderPage, parentId, siteId],
  );

  // Render drag overlay for pages
  const renderDragOverlay = (activeId: string | number) => {
    const page = pageMap.get(String(activeId));
    if (!page) return null;

    const isDefault = defaultPageId === page._id;

    return (
      <div className="bg-sidebar border rounded-md shadow-lg px-3 py-2 flex items-center gap-2 opacity-95">
        {isDefault ? (
          <Home className="h-4 w-4 text-primary" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        <span className="text-sm truncate max-w-[150px]">{page.title}</span>
        {isDefault && (
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
            Default
          </span>
        )}
      </div>
    );
  };

  if (pages.length === 0) {
    return null;
  }

  return (
    <DndProvider
      items={pageIds}
      onDragEnd={handleDragEnd}
      renderDragOverlay={renderDragOverlay}
    >
      {sortedPages.map((page) => (
        <SortablePageItem
          key={page._id}
          page={page}
          allPages={allPages}
          selectedPageId={selectedPageId}
          siteId={siteId}
          defaultPageId={defaultPageId}
          depth={depth}
          onSelect={onSelect}
        />
      ))}
    </DndProvider>
  );
}

interface SortablePageItemProps {
  page: PageListItem;
  allPages: PageListItem[];
  selectedPageId?: string;
  siteId: string;
  defaultPageId?: string;
  depth: number;
  onSelect: (pageId: string) => void;
}

function SortablePageItem({
  page,
  allPages,
  selectedPageId,
  siteId,
  defaultPageId,
  depth,
  onSelect,
}: SortablePageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const children = allPages.filter((p) => p.parentId === page._id);
  const isDefault = defaultPageId === page._id;

  return (
    <>
      <SidebarMenuItem
        ref={setNodeRef}
        style={style}
        className={cn(
          "group/page",
          isDragging && "opacity-50 ring-2 ring-primary rounded-md",
        )}
      >
        <SidebarMenuButton
          isActive={selectedPageId === page._id}
          onClick={() => onSelect(page._id)}
          className="w-full relative pr-8"
          style={{ paddingLeft: `${(depth + 1) * 12 + 20}px` }}
        >
          {/* Drag handle */}
          <div
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/page:opacity-100 transition-opacity"
            style={{ left: `${(depth + 1) * 12 - 4}px` }}
          >
            <DragHandle className="h-5 w-5" />
          </div>

          {isDefault ? (
            <Home className="h-4 w-4 text-primary" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          <span className="truncate">{page.title}</span>
          {isDefault && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full ml-auto">
              Default
            </span>
          )}
          <PageActionsMenu page={page} siteId={siteId} isDefault={isDefault} />
        </SidebarMenuButton>
      </SidebarMenuItem>

      {/* Recursively render children with their own DnD context */}
      {children.length > 0 && (
        <SortablePageTree
          pages={children}
          allPages={allPages}
          selectedPageId={selectedPageId}
          siteId={siteId}
          defaultPageId={defaultPageId}
          parentId={page._id}
          depth={depth + 1}
          onSelect={onSelect}
        />
      )}
    </>
  );
}

function PageActionsMenu({
  page,
  siteId,
  isDefault,
}: {
  page: PageListItem;
  siteId: string;
  isDefault: boolean;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
