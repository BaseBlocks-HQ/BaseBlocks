"use client";

import { cn } from "@/lib/utils";
import { isPageRestricted } from "@baseblocks/domain";
import type { PageListItem } from "@baseblocks/domain";
import { SidebarMenuItem } from "@baseblocks/ui/sidebar";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, EyeOff, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { IconFile, IconHouse } from "nucleo-glass";
import type { ReactNode } from "react";
import type { FlattenedPage } from "../tree";
import { isValidDrop } from "../tree";
import { useTreeDndContext } from "./tree-dnd-context";
import { DropHighlight, DropLine } from "./tree-drop-indicator";

const treeItemButtonClassName =
  "flex h-full w-full min-w-0 items-center gap-2 overflow-hidden rounded-md p-2 pr-1 text-left text-sm outline-hidden [&>svg]:size-4 [&>svg]:shrink-0";

const treeItemRowClassName =
  "peer/menu-button grid h-8 w-full min-w-0 grid-cols-[minmax(0,1fr)_1.75rem] items-center overflow-hidden rounded-md text-sm outline-hidden ring-ring transition-colors hover:bg-accent hover:text-accent-foreground active:bg-accent active:text-accent-foreground data-[active=true]:bg-accent data-[active=true]:font-medium data-[active=true]:text-accent-foreground";

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
  const t = useTranslations("navigation.tree");
  const { activeId, projection, dropZone } = useTreeDndContext();

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !canEdit });

  const style = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition,
  };

  const page = item.page;
  const isDefault = defaultPageId === page._id;
  const isGhost = isDragging;
  const isRestricted = isPageRestricted(page.accessPolicy);
  const isHiddenFromNavigation = page.showInNavigation === false;

  const isDropTarget =
    activeId !== null &&
    projection?.overId === item.id &&
    isValidDrop(allPages, String(activeId), projection);

  const isSelfHover = item.id === String(activeId);

  const showBeforeLine = isDropTarget && dropZone === "before" && !isSelfHover;
  const showAfterLine = isDropTarget && dropZone === "after";
  const showInsideHighlight =
    isDropTarget && dropZone === "inside" && !isSelfHover;

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand();
  };

  return (
    <SidebarMenuItem
      ref={setNodeRef}
      style={style}
      className={cn("group/page relative w-full min-w-0 overflow-hidden")}
    >
      {showBeforeLine && <DropLine position="before" />}
      {showAfterLine && <DropLine position="after" />}
      {showInsideHighlight && <DropHighlight />}

      <div
        ref={setActivatorNodeRef}
        data-active={selectedPageId === page._id}
        className={cn(
          treeItemRowClassName,
          canEdit && "cursor-grab active:cursor-grabbing",
          isGhost && "opacity-30",
        )}
        {...(canEdit ? listeners : {})}
      >
        <button
          type="button"
          onClick={() => onSelect(page._id)}
          className={treeItemButtonClassName}
          {...(canEdit ? attributes : {})}
        >
          {hasChildren ? (
            <span className="relative h-4 w-4 shrink-0">
              <span className="absolute inset-0 flex items-center justify-center opacity-100 transition-opacity group-hover/page:opacity-0">
                {isDefault ? (
                  <IconHouse className="h-4 w-4 text-primary" />
                ) : (
                  <IconFile className="h-4 w-4" />
                )}
              </span>
              <span
                role="button"
                tabIndex={0}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handleToggleExpand}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onToggleExpand();
                  }
                }}
                className="absolute inset-0 flex cursor-pointer items-center justify-center text-muted-foreground opacity-0 transition-colors transition-opacity hover:text-foreground group-hover/page:opacity-100"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </span>
            </span>
          ) : isDefault ? (
            <IconHouse className="h-4 w-4 text-primary" />
          ) : (
            <IconFile className="h-4 w-4" />
          )}

          <span className="min-w-0 flex-1 truncate">{page.title}</span>
          {isHiddenFromNavigation && (
            <EyeOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          {isRestricted && (
            <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          {isDefault && (
            <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
              {t("defaultBadge")}
            </span>
          )}
        </button>

        {!isGhost && actionsMenu ? (
          <div className="relative z-10 flex h-8 w-7 min-w-0 items-center justify-center overflow-hidden">
            {actionsMenu}
          </div>
        ) : (
          <span className="h-8 w-7 min-w-0" />
        )}
      </div>
    </SidebarMenuItem>
  );
}
