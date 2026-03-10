"use client";

import { cn } from "@/lib/utils";
import { DragHandle } from "@/modules/shared/dnd";
import type { PageListItem } from "@baseblocks/types";
import { SidebarMenuButton, SidebarMenuItem } from "@baseblocks/ui/sidebar";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight } from "lucide-react";
import { IconFile, IconHouse } from "nucleo-glass";
import type { ReactNode } from "react";
import type { FlattenedPage } from "../tree";
import { INDENT_WIDTH, isValidDrop } from "../tree";
import { useTreeDndContext } from "./tree-dnd-context";
import { DropHighlight, DropLine } from "./tree-drop-indicator";

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
  const { activeId, projection, dropZone } = useTreeDndContext();

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
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition,
  };

  const page = item.page;
  const isDefault = defaultPageId === page._id;
  const isGhost = isDragging;
  const indentPadding = (item.depth + 1) * INDENT_WIDTH + 20;

  const isDropTarget =
    activeId !== null &&
    projection?.overId === item.id &&
    isValidDrop(allPages, String(activeId), projection);

  const isSelfHover = item.id === String(activeId);

  const showBeforeLine = isDropTarget && dropZone === "before" && !isSelfHover;
  const showAfterLine = isDropTarget && dropZone === "after";
  const showInsideHighlight =
    isDropTarget && dropZone === "inside" && !isSelfHover;

  const lineDepth = projection?.depth ?? item.depth;

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand();
  };

  return (
    <SidebarMenuItem
      ref={setNodeRef}
      style={style}
      className={cn("group/page relative")}
    >
      {showBeforeLine && <DropLine position="before" depth={lineDepth} />}
      {showAfterLine && <DropLine position="after" depth={lineDepth} />}
      {showInsideHighlight && <DropHighlight />}

      <SidebarMenuButton
        isActive={selectedPageId === page._id}
        onClick={() => onSelect(page._id)}
        className={cn("w-full pr-8", isGhost && "opacity-30")}
        style={{ paddingLeft: `${indentPadding}px` }}
      >
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

        {hasChildren ? (
          // biome-ignore lint/a11y/useSemanticElements: nested inside SidebarMenuButton which renders as <button> — can't nest <button> in <button>
          <div
            role="button"
            tabIndex={0}
            onClick={handleToggleExpand}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggleExpand();
              }
            }}
            className="h-4 w-4 flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </div>
        ) : (
          <span className="w-4" />
        )}

        {isDefault ? (
          <IconHouse className="h-4 w-4 text-primary" />
        ) : (
          <IconFile className="h-4 w-4" />
        )}
        <span className="truncate">{page.title}</span>
        {isDefault && (
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full ml-auto">
            Default
          </span>
        )}
      </SidebarMenuButton>

      {!isGhost && actionsMenu}
    </SidebarMenuItem>
  );
}
