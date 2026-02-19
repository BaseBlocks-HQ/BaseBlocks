"use client";

import { DragHandle } from "@/components/dnd";
import { HomeIcon, PagesIcon } from "@/components/icons";
import { SidebarMenuButton, SidebarMenuItem } from "@repo/ui/sidebar";
import type { FlattenedPage } from "@/lib/tree-utils";
import { INDENT_WIDTH, isValidDrop } from "@/lib/tree-utils";
import { cn } from "@/lib/utils";
import type { PageListItem } from "@repo/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useTreeDndContext } from "./tree-dnd-context";

interface SortableTreeItemProps {
  item: FlattenedPage;
  allPages: PageListItem[];
  selectedPageId?: string;
  defaultPageId?: string;
  hasChildren: boolean;
  isExpanded: boolean;
  canEdit: boolean;
  onSelect: (pageId: string) => void;
  onToggleExpand: () => void;
  actionsMenu?: ReactNode;
}

export function SortableTreeItem({
  item,
  allPages,
  selectedPageId,
  defaultPageId,
  hasChildren,
  isExpanded,
  canEdit,
  onSelect,
  onToggleExpand,
  actionsMenu,
}: SortableTreeItemProps) {
  const { activeId, projection, nestTargetId } = useTreeDndContext();

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const page = item.page;
  const isDefault = defaultPageId === page._id;
  const isActive = activeId === item.id;

  // Calculate indentation padding
  const indentPadding = (item.depth + 1) * INDENT_WIDTH + 20;

  // Check if this is a valid drop target
  const isValidDropTarget =
    activeId !== null &&
    projection?.overId === item.id &&
    activeId !== item.id &&
    isValidDrop(allPages, String(activeId), projection);

  // Determine drop indicator type
  const dropPosition = isValidDropTarget ? projection?.position : null;
  const isNestTarget = nestTargetId === item.id && dropPosition === "child";

  // Calculate drop indicator position based on projection depth
  const dropIndicatorLeft = projection
    ? (projection.depth + 1) * INDENT_WIDTH + 20
    : indentPadding;

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand();
  };

  return (
    <SidebarMenuItem
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/page relative",
        isDragging && "opacity-50 z-50",
        isActive && "z-50",
      )}
    >
      {/* Drop indicator: Line for before/after positions */}
      {(dropPosition === "before" || dropPosition === "after") && (
        <div
          className="absolute right-2 h-0.5 bg-primary rounded-full pointer-events-none z-20"
          style={{
            left: `${dropIndicatorLeft}px`,
            top: dropPosition === "before" ? "-1px" : "auto",
            bottom: dropPosition === "after" ? "-1px" : "auto",
          }}
        >
          {/* Circle indicator at the start of the line */}
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
        </div>
      )}

      {/* Drop indicator: Highlight for nesting (child position) */}
      {isNestTarget && (
        <div
          className="absolute inset-y-0 right-1 rounded-md border-2 border-primary/80 bg-primary/5 pointer-events-none z-10 transition-all"
          style={{ left: `${indentPadding - 8}px` }}
        />
      )}

      <SidebarMenuButton
        isActive={selectedPageId === page._id}
        onClick={() => onSelect(page._id)}
        className={cn("w-full pr-8", isActive && "ring-2 ring-primary")}
        style={{ paddingLeft: `${indentPadding}px` }}
      >
        {/* Drag handle - only show for users with edit permissions */}
        {canEdit && (
          <div
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/page:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
            style={{ left: `${(item.depth + 1) * INDENT_WIDTH - 4}px` }}
          >
            <DragHandle className="h-5 w-5" />
          </div>
        )}

        {/* Expand/collapse toggle for pages with children */}
        {hasChildren ? (
          <span
            role="button"
            tabIndex={0}
            onClick={handleToggleExpand}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleToggleExpand(e as unknown as React.MouseEvent);
              }
            }}
            className="h-4 w-4 flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </span>
        ) : (
          <span className="w-4" />
        )}

        {isDefault ? (
          <HomeIcon className="h-4 w-4 text-primary" />
        ) : (
          <PagesIcon className="h-4 w-4" />
        )}
        <span className="truncate">{page.title}</span>
        {isDefault && (
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full ml-auto">
            Default
          </span>
        )}
      </SidebarMenuButton>

      {actionsMenu}
    </SidebarMenuItem>
  );
}
