"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, StarIcon } from "@hugeicons/core-free-icons";
import { InlineRename } from "@/components/tree/inline-rename";
import { MiddleTruncate } from "@/components/tree/middle-truncate";
import { OverflowTooltip } from "@/components/tree/overflow-tooltip";
import {
  AnimatedTreeRow,
  AnimatedTreeRows,
} from "@/components/tree/animated-tree";
import { useTreeDisclosure } from "@/components/tree/use-tree-disclosure";
import { useEditorSiteOptional } from "@/features/editor/editor-state";
import {
  appSidebarIconSlotClassName,
  appSidebarRowHeightClassName,
} from "@/features/app-shell/app-sidebar-row";
import { api, type Id } from "@baseblocks/backend";
import {
  ActionRow,
  ActionRowLabel,
  ActionRowMain,
  ActionRowStatus,
} from "@baseblocks/ui/action-row";
import {
  getTreeDescendantIds,
  indexTree,
  projectIndexedTree,
  type PageListItem,
  type ProjectedTreeNode,
  type TreeDropPlacement,
  type TreeNode,
} from "@baseblocks/domain";
import { cn } from "@baseblocks/ui/lib/utils";
import { SidebarMenuButton } from "@baseblocks/ui/sidebar";
import { closestCenter } from "@dnd-kit/collision";
import { PointerActivationConstraints } from "@dnd-kit/dom";
import {
  DragDropProvider,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
} from "@dnd-kit/react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { type ReactNode, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PageActionsMenus } from "./page-actions";

type PageTreeNode = TreeNode<PageListItem>;
type PageTreeRow = ProjectedTreeNode<PageListItem>;

type PageDropData = {
  kind: "page-tree-drop";
  pageId: string | null;
  placement: TreeDropPlacement;
};

const pageDragSensors = [
  PointerSensor.configure({
    activationConstraints: [
      new PointerActivationConstraints.Distance({ value: 6 }),
    ],
  }),
  KeyboardSensor,
];

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
  const renamePage = useMutation(api.pages.rename);
  const movePage = useMutation(api.pages.moveInTree);
  const nodes = useMemo(() => toTreeNodes(allPages), [allPages]);
  const treeIndex = useMemo(() => indexTree(nodes), [nodes]);
  const disclosure = useTreeDisclosure(treeIndex, selectedPageId);
  const rows = projectIndexedTree(treeIndex, disclosure.expandedIds);
  const draggedPage = draggedPageId
    ? (allPages.find((page) => page._id === draggedPageId) ?? null)
    : null;
  const invalidDropIds = getTreeDescendantIds(treeIndex, draggedPageId);

  if (rows.length === 0) return null;

  const tree = (
    <>
      <AnimatedTreeRows>
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
            isExpanded={disclosure.expandedIds.has(item.id)}
            onSelect={onSelect}
            onToggleExpand={() => disclosure.toggle(item.id)}
            siteId={siteId}
            onChildCreated={() => disclosure.expand(item.id)}
            renaming={renamingId === item.id}
            onRename={() => setRenamingId(item.id)}
            onRenameCancel={() => setRenamingId(null)}
            onRenameSave={async (title) => {
              await renamePage({
                pageId: item.data._id as Id<"pages">,
                title,
              });
              setRenamingId(null);
            }}
          />
        ))}
      </AnimatedTreeRows>
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
      sensors={pageDragSensors}
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
            disclosure.expand(targetPageId);
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
  canEdit,
  defaultPageId,
  dragActive,
  dragDisabled,
  dropDisabled,
  isExpanded,
  item,
  onSelect,
  onChildCreated,
  onToggleExpand,
  selectedPageId,
  renaming,
  onRename,
  onRenameCancel,
  onRenameSave,
  siteId,
}: {
  canEdit: boolean;
  defaultPageId?: string;
  dragActive: boolean;
  dragDisabled: boolean;
  dropDisabled: boolean;
  isExpanded: boolean;
  item: PageTreeRow;
  onSelect: (pageId: string) => void;
  onChildCreated: () => void;
  onToggleExpand: () => void;
  selectedPageId?: string;
  renaming: boolean;
  onRename: () => void;
  onRenameCancel: () => void;
  onRenameSave: (title: string) => Promise<void>;
  siteId: string;
}) {
  const t = useTranslations("navigation.tree");
  const page = item.data;
  const isDefault = defaultPageId === page._id;
  const pageButtonRef = useRef<HTMLButtonElement>(null);
  const { ref, handleRef, isDragging } = useDraggable({
    id: item.id,
    disabled: !canEdit || dragDisabled || renaming,
    data: { kind: "page-tree-page", pageId: item.id },
  });

  const focusPageButtonAfterMenu = () => {
    const button = pageButtonRef.current;
    if (!button) return;
    button.dataset.menuReturnFocus = "true";
    button.focus({ preventScroll: true });
  };

  const renderRow = (actionsTrigger?: ReactNode) => (
    <AnimatedTreeRow
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
        style={{
          paddingInlineStart: `calc(var(--app-sidebar-leading-inset) + ${item.depth * 0.75}rem)`,
        }}
        className={cn(
          "flex min-w-0 gap-1.5 overflow-hidden rounded-md p-0 text-xs font-normal transition-colors data-[active=true]:font-medium",
          appSidebarRowHeightClassName,
          canEdit &&
            !dragDisabled &&
            !renaming &&
            "cursor-grab active:cursor-grabbing",
          isDragging && "opacity-30",
        )}
      >
        <ActionRow asChild>
          <div
            ref={
              renaming
                ? undefined
                : (element) => {
                    ref(element);
                    handleRef(element);
                  }
            }
          >
            <span className={cn("relative", appSidebarIconSlotClassName)}>
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-0 flex items-center justify-center text-[0.8125rem] leading-none transition-opacity duration-100 ease-[cubic-bezier(0.2,0,0,1)]",
                  item.hasChildren &&
                    "group-hover/page:opacity-0 group-has-[button[data-page-disclosure]:focus-visible]/page:opacity-0 pointer-coarse:opacity-0",
                )}
              >
                {page.icon ?? "📄"}
              </span>
              {item.hasChildren ? (
                <button
                  type="button"
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} ${page.title}`}
                  className="absolute inset-0 z-30 flex items-center justify-center rounded-sm text-sidebar-foreground/45 opacity-0 outline-none transition-opacity duration-100 ease-[cubic-bezier(0.2,0,0,1)] hover:text-sidebar-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring group-hover/page:opacity-100 pointer-coarse:opacity-100"
                  data-page-disclosure
                  onClick={onToggleExpand}
                >
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    className={cn(
                      "size-3.5 transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
                      isExpanded && "rotate-90",
                    )}
                  />
                </button>
              ) : null}
            </span>

            {renaming ? (
              <div className="flex h-7 min-w-0 flex-1 items-center pr-1">
                <InlineRename
                  label={`Rename ${page.title}`}
                  value={page.title}
                  onCancel={onRenameCancel}
                  onError={(error) =>
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Failed to rename page",
                    )
                  }
                  onSave={onRenameSave}
                />
              </div>
            ) : (
              <>
                <OverflowTooltip content={page.title}>
                  {(textRef) => (
                    <ActionRowMain
                      ref={pageButtonRef}
                      type="button"
                      onClick={() => onSelect(page._id)}
                      className="flex h-7 min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring data-[menu-return-focus=true]:focus-visible:ring-0"
                      onBlur={(event) => {
                        delete event.currentTarget.dataset.menuReturnFocus;
                      }}
                    >
                      <ActionRowLabel className="flex min-w-0 flex-1">
                        <MiddleTruncate
                          className="flex-1"
                          leadingRef={textRef}
                          onDoubleClick={onRename}
                          text={page.title}
                        />
                      </ActionRowLabel>
                    </ActionRowMain>
                  )}
                </OverflowTooltip>
                {isDefault ? (
                  <ActionRowStatus className="absolute inset-y-0 end-[var(--app-sidebar-trailing-inset)] z-20 flex w-7 items-center justify-center text-sidebar-foreground/35">
                    <HugeiconsIcon
                      aria-hidden
                      className="size-3"
                      icon={StarIcon}
                      strokeWidth={1.75}
                    />
                    <span className="sr-only">{t("defaultBadge")}</span>
                  </ActionRowStatus>
                ) : null}
                {actionsTrigger}
              </>
            )}
          </div>
        </ActionRow>
      </SidebarMenuButton>
    </AnimatedTreeRow>
  );

  if (!canEdit) return renderRow();

  return (
    <PageActionsMenus
      isDefault={isDefault}
      onChildCreated={onChildCreated}
      onRename={onRename}
      onReturnFocus={focusPageButtonAfterMenu}
      page={page}
      siteId={siteId}
    >
      {(trigger) => renderRow(trigger)}
    </PageActionsMenus>
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

  if (!active || disabled) return null;

  return (
    <div
      ref={ref}
      data-page-drop="root-end"
      className={cn(
        "relative h-8 pointer-events-auto",
        isDropTarget &&
          "after:absolute after:inset-x-1 after:top-2 after:h-0.5 after:rounded-full after:bg-primary",
      )}
    />
  );
}

function PageDragPreview({ page }: { page: PageListItem }) {
  return (
    <div className="flex h-8 max-w-64 items-center gap-1.5 rounded-lg border border-sidebar-border bg-sidebar px-3 text-xs text-sidebar-foreground shadow-xl">
      <span aria-hidden="true" className="shrink-0 text-sm leading-none">
        {page.icon ?? "📄"}
      </span>
      <MiddleTruncate className="flex-1" text={page.title} />
    </div>
  );
}
