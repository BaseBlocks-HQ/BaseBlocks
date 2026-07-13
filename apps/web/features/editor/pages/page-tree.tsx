"use client";

import { InlineRename } from "@/components/tree/inline-rename";
import { OverflowTooltip } from "@/components/tree/overflow-tooltip";
import { useEditorSiteOptional } from "@/features/editor/editor-state";
import { api, type Id } from "@baseblocks/backend";
import {
  generateSlug,
  projectTree,
  type PageListItem,
  type ProjectedTreeNode,
  type TreeDropPlacement,
  type TreeNode,
} from "@baseblocks/domain";
import { cn } from "@baseblocks/ui/lib/utils";
import { SidebarMenuButton, SidebarMenuItem } from "@baseblocks/ui/sidebar";
import { closestCenter } from "@dnd-kit/collision";
import {
  DragDropProvider,
  DragOverlay,
  useDraggable,
  useDroppable,
} from "@dnd-kit/react";
import { useMutation } from "convex/react";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageActionsMenu } from "./page-actions";

type PageTreeNode = TreeNode<PageListItem>;
type PageTreeRow = ProjectedTreeNode<PageListItem>;

type PageDropData = {
  kind: "page-tree-drop";
  pageId: string | null;
  placement: TreeDropPlacement;
};

interface PageTreeProps {
  allPages: PageListItem[];
  selectedPageId?: string;
  siteId: string;
  defaultPageId?: string;
  onSelect: (pageId: string) => void;
}

function toTreeNodes(pages: PageListItem[]): PageTreeNode[] {
  return pages.map((page) => ({
    id: page._id,
    parentId: page.parentId ?? null,
    label: page.title,
    order: page.order,
    data: page,
  }));
}

function descendantIds(nodes: PageTreeNode[], nodeId: string | null) {
  if (!nodeId) return new Set<string>();
  const children = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const siblings = children.get(node.parentId) ?? [];
    siblings.push(node.id);
    children.set(node.parentId, siblings);
  }

  const result = new Set<string>([nodeId]);
  const queue = [...(children.get(nodeId) ?? [])];
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || result.has(id)) continue;
    result.add(id);
    queue.push(...(children.get(id) ?? []));
  }
  return result;
}

function ancestorIds(nodes: PageTreeNode[], nodeId?: string) {
  const result = new Set<string>();
  if (!nodeId) return result;

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  let cursor = byId.get(nodeId);

  while (cursor?.parentId && !visited.has(cursor.parentId)) {
    visited.add(cursor.parentId);
    result.add(cursor.parentId);
    cursor = byId.get(cursor.parentId);
  }

  return result;
}

function isPageDropData(value: unknown): value is PageDropData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PageDropData>;
  return (
    candidate.kind === "page-tree-drop" &&
    (candidate.pageId === null || typeof candidate.pageId === "string") &&
    (candidate.placement === "before" ||
      candidate.placement === "after" ||
      candidate.placement === "inside" ||
      candidate.placement === "root-end")
  );
}

export function PageTree({
  allPages,
  selectedPageId,
  siteId,
  defaultPageId,
  onSelect,
}: PageTreeProps) {
  const editorSite = useEditorSiteOptional();
  const canEdit = editorSite?.canEdit ?? false;
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [pendingPageId, setPendingPageId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const updatePage = useMutation(api.pages.update);
  const movePage = useMutation(api.pages.moveInTree);
  const nodes = toTreeNodes(allPages);
  const rows = projectTree(nodes, expanded);
  const draggedPage = draggedPageId
    ? (allPages.find((page) => page._id === draggedPageId) ?? null)
    : null;
  const invalidDropIds = descendantIds(nodes, draggedPageId);

  useEffect(() => {
    const ancestors = ancestorIds(nodes, selectedPageId);
    if (ancestors.size === 0) return;

    setExpanded((current) => {
      if ([...ancestors].every((id) => current.has(id))) return current;
      return new Set([...current, ...ancestors]);
    });
  }, [nodes, selectedPageId]);

  if (rows.length === 0) return null;

  const tree = (
    <>
      {rows.map((item) => (
        <PageTreeRow
          key={item.id}
          item={item}
          selectedPageId={selectedPageId}
          defaultPageId={defaultPageId}
          canEdit={canEdit}
          dragActive={draggedPageId !== null}
          dragDisabled={pendingPageId !== null}
          dropDisabled={invalidDropIds.has(item.id)}
          isExpanded={expanded.has(item.id)}
          onSelect={onSelect}
          onToggleExpand={() => {
            setExpanded((current) => {
              const next = new Set(current);
              if (next.has(item.id)) next.delete(item.id);
              else next.add(item.id);
              return next;
            });
          }}
          actionsMenu={
            canEdit ? (
              <PageActionsMenu
                page={item.data}
                siteId={siteId}
                isDefault={defaultPageId === item.data._id}
                onChildCreated={() => {
                  setExpanded((current) => new Set(current).add(item.id));
                }}
              />
            ) : null
          }
          renaming={renamingId === item.id}
          onRename={() => setRenamingId(item.id)}
          onRenameCancel={() => setRenamingId(null)}
          onRenameSave={async (title) => {
            await updatePage({
              pageId: item.data._id as Id<"pages">,
              title,
              slug: generateSlug(title),
            });
            setRenamingId(null);
          }}
        />
      ))}
      {canEdit ? (
        <RootEndDropZone
          active={draggedPageId !== null}
          disabled={pendingPageId !== null}
        />
      ) : null}
    </>
  );

  return (
    <DragDropProvider
      onDragStart={(event) => {
        if (!canEdit) return;
        setDraggedPageId(String(event.operation.source?.id ?? "") || null);
      }}
      onDragEnd={(event) => {
        if (!canEdit) return;
        const pageId = String(event.operation.source?.id ?? "");
        const data = event.operation.target?.data;
        setDraggedPageId(null);

        if (event.canceled || !pageId || !isPageDropData(data)) return;
        setPendingPageId(pageId);
        void movePage({
          siteId: siteId as Id<"sites">,
          pageId: pageId as Id<"pages">,
          targetId: data.pageId ? (data.pageId as Id<"pages">) : undefined,
          placement: data.placement,
        })
          .then(() => {
            const targetPageId = data.pageId;
            if (data.placement !== "inside" || !targetPageId) return;
            setExpanded((current) => new Set(current).add(targetPageId));
          })
          .catch((error) => {
            toast.error(
              error instanceof Error ? error.message : "Failed to move page",
            );
          })
          .finally(() => setPendingPageId(null));
      }}
    >
      {tree}
      <DragOverlay>
        {canEdit && draggedPage ? <PageDragPreview page={draggedPage} /> : null}
      </DragOverlay>
    </DragDropProvider>
  );
}

function PageTreeRow({
  actionsMenu,
  canEdit,
  defaultPageId,
  dragActive,
  dragDisabled,
  dropDisabled,
  isExpanded,
  item,
  onSelect,
  onToggleExpand,
  selectedPageId,
  renaming,
  onRename,
  onRenameCancel,
  onRenameSave,
}: {
  actionsMenu?: ReactNode;
  canEdit: boolean;
  defaultPageId?: string;
  dragActive: boolean;
  dragDisabled: boolean;
  dropDisabled: boolean;
  isExpanded: boolean;
  item: PageTreeRow;
  onSelect: (pageId: string) => void;
  onToggleExpand: () => void;
  selectedPageId?: string;
  renaming: boolean;
  onRename: () => void;
  onRenameCancel: () => void;
  onRenameSave: (title: string) => Promise<void>;
}) {
  const t = useTranslations("navigation.tree");
  const page = item.data;
  const isDefault = defaultPageId === page._id;
  const { ref, handleRef, isDragging } = useDraggable({
    id: item.id,
    disabled: !canEdit || dragDisabled || renaming,
    data: { kind: "page-tree-page", pageId: item.id },
  });

  return (
    <SidebarMenuItem
      aria-level={item.depth + 1}
      aria-expanded={item.hasChildren ? isExpanded : undefined}
      className="group/page relative w-full min-w-0"
      role="treeitem"
    >
      <PageDropZones
        active={dragActive}
        disabled={dropDisabled}
        pageId={item.id}
      />
      <SidebarMenuButton
        asChild
        isActive={selectedPageId === page._id}
        className={cn(
          "gap-0 p-0 font-normal data-[active=true]:font-medium",
          canEdit
            ? "grid grid-cols-[1.5rem_minmax(0,1fr)_1.25rem_1.75rem]"
            : "grid grid-cols-[1.5rem_minmax(0,1fr)_1.75rem]",
          isDragging && "opacity-30",
        )}
      >
        <div ref={ref}>
          {item.hasChildren ? (
            <button
              type="button"
              aria-label={`${isExpanded ? "Collapse" : "Expand"} ${page.title}`}
              className="flex h-8 w-6 items-center justify-center text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              onClick={onToggleExpand}
            >
              {isExpanded ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
            </button>
          ) : (
            <span className="h-8 w-6" />
          )}

          <OverflowTooltip content={page.title} disabled={renaming}>
            {(textRef) => (
              <button
                type="button"
                onClick={() => onSelect(page._id)}
                className="flex h-8 min-w-0 items-center gap-1.5 overflow-hidden pr-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                {renaming ? (
                  <InlineRename
                    label={`Rename ${page.title}`}
                    value={page.title}
                    onCancel={onRenameCancel}
                    onSave={onRenameSave}
                  />
                ) : (
                  <span
                    ref={textRef}
                    className="min-w-0 flex-1 truncate"
                    onDoubleClick={onRename}
                  >
                    {page.title}
                  </span>
                )}
                {isDefault ? (
                  <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                    {t("defaultBadge")}
                  </span>
                ) : null}
              </button>
            )}
          </OverflowTooltip>

          {canEdit ? (
            <button
              ref={handleRef}
              type="button"
              aria-label={`Move ${page.title}`}
              className="relative z-30 flex h-8 w-5 cursor-grab items-center justify-center text-muted-foreground opacity-0 outline-none transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/page:opacity-100 active:cursor-grabbing"
            >
              <GripVertical className="size-3.5" />
            </button>
          ) : null}

          {actionsMenu ? (
            <div className="relative z-30 flex h-8 w-7 items-center justify-center">
              {actionsMenu}
            </div>
          ) : (
            <span className="h-8 w-7" />
          )}
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function PageDropZones({
  active,
  disabled,
  pageId,
}: {
  active: boolean;
  disabled: boolean;
  pageId: string;
}) {
  return (
    <>
      <PageDropZone
        active={active}
        disabled={disabled}
        pageId={pageId}
        placement="before"
      />
      <PageDropZone
        active={active}
        disabled={disabled}
        pageId={pageId}
        placement="inside"
      />
      <PageDropZone
        active={active}
        disabled={disabled}
        pageId={pageId}
        placement="after"
      />
    </>
  );
}

function PageDropZone({
  active,
  disabled,
  pageId,
  placement,
}: {
  active: boolean;
  disabled: boolean;
  pageId: string;
  placement: "before" | "after" | "inside";
}) {
  const { ref, isDropTarget } = useDroppable<PageDropData>({
    id: `page-drop:${placement}:${pageId}`,
    disabled,
    data: { kind: "page-tree-drop", pageId, placement },
    collisionDetector: closestCenter,
  });

  return (
    <div
      ref={ref}
      data-page-drop={`${placement}:${pageId}`}
      className={cn(
        "absolute inset-x-0 z-20 pointer-events-none",
        placement === "before" && "-top-1 h-2",
        placement === "inside" && "inset-y-1.5",
        placement === "after" && "-bottom-1 h-2",
        active && !disabled && "pointer-events-auto",
        isDropTarget &&
          placement === "inside" &&
          "rounded-md bg-primary/10 ring-2 ring-inset ring-primary/50",
        isDropTarget &&
          placement !== "inside" &&
          "after:absolute after:inset-x-1 after:top-1/2 after:h-0.5 after:-translate-y-1/2 after:rounded-full after:bg-primary",
      )}
    />
  );
}

function RootEndDropZone({
  active,
  disabled,
}: {
  active: boolean;
  disabled: boolean;
}) {
  const { ref, isDropTarget } = useDroppable<PageDropData>({
    id: "page-drop:root-end",
    disabled,
    data: { kind: "page-tree-drop", pageId: null, placement: "root-end" },
    collisionDetector: closestCenter,
  });

  return (
    <div
      ref={ref}
      data-page-drop="root-end"
      className={cn(
        "relative h-3 pointer-events-none",
        active && !disabled && "h-8 pointer-events-auto",
        isDropTarget &&
          "after:absolute after:inset-x-1 after:top-2 after:h-0.5 after:rounded-full after:bg-primary",
      )}
    />
  );
}

function PageDragPreview({ page }: { page: PageListItem }) {
  return (
    <div className="flex h-9 max-w-64 items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar px-3 text-sm text-sidebar-foreground shadow-xl">
      <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{page.title}</span>
    </div>
  );
}
