"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Delete01Icon,
  Download01Icon,
  DragDropVerticalIcon,
  Folder01Icon,
  FolderAddIcon,
  Link01Icon,
  PencilEdit01Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import {
  appSidebarIconSlotClassName,
  appSidebarRowGapClassName,
  appSidebarRowHeightClassName,
  getAppSidebarTreePaddingInlineStart,
} from "@/features/app-shell/app-sidebar-row";
import type { FolderId, LibraryEntity } from "@/features/libraries/model";
import { InlineRename } from "@/components/tree/inline-rename";
import { MiddleTruncate } from "@/components/tree/middle-truncate";
import { formatFileSize } from "@/components/file-viewer/file-ui";
import {
  getTreeDescendantIds,
  indexTree,
  projectIndexedTree,
  type ProjectedTreeNode,
  type TreeDropPlacement,
  type TreeNode,
} from "@baseblocks/domain";
import { cn } from "@baseblocks/ui/lib/utils";
import { Button } from "@baseblocks/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@baseblocks/ui/context-menu";
import { Empty, EmptyHeader, EmptyTitle } from "@baseblocks/ui/empty";
import { closestCenter } from "@dnd-kit/collision";
import { PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import {
  DragDropProvider,
  DragOverlay,
  useDraggable,
  useDroppable,
} from "@dnd-kit/react";
import { useState } from "react";
import { toast } from "sonner";
import { LibraryFileIcon } from "./library-file-icon";

type LibraryDropData = {
  kind: "library-tree-drop";
  entityId: string | null;
  placement: TreeDropPlacement;
};

const libraryDragSensors = [
  PointerSensor.configure({
    activationConstraints: [
      new PointerActivationConstraints.Distance({ value: 6 }),
    ],
  }),
];

function isLibraryDropData(value: unknown): value is LibraryDropData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LibraryDropData>;
  return (
    candidate.kind === "library-tree-drop" &&
    (candidate.entityId === null || typeof candidate.entityId === "string") &&
    (candidate.placement === "before" ||
      candidate.placement === "after" ||
      candidate.placement === "inside" ||
      candidate.placement === "root-end")
  );
}

export function LibraryTree(props: {
  allowDownloads: boolean;
  canManage: boolean;
  currentFolderId: FolderId | null;
  nodes: TreeNode<LibraryEntity>[];
  onCopyLink: (entity: LibraryEntity) => Promise<void> | void;
  onCreateFolder: (name: string, parentId?: FolderId) => Promise<void>;
  onDeleteEntity: (entity: LibraryEntity) => void;
  onDownloadFile: (entity: LibraryEntity) => void;
  onOpenEntity: (entity: LibraryEntity) => void;
  onMoveEntity: (move: {
    entityId: string;
    targetId: string | null;
    placement: TreeDropPlacement;
  }) => Promise<void>;
  onRenameEntity: (entity: LibraryEntity, name: string) => Promise<void>;
  onUploadFiles: () => void;
  selectedEntityId: string | null;
  title?: string;
  uploadDisabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(
    () =>
      new Set(
        props.nodes.filter((n) => n.data.kind === "folder").map((n) => n.id),
      ),
  );
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const treeIndex = indexTree(props.nodes);
  const rows = projectIndexedTree(treeIndex, expanded);
  const draggedEntity = draggedId
    ? (treeIndex.byId.get(draggedId)?.data ?? null)
    : null;
  const invalidDropIds = getTreeDescendantIds(treeIndex, draggedId);
  return (
    <DragDropProvider
      sensors={libraryDragSensors}
      onDragStart={(event) => {
        if (!props.canManage) return;
        queueMicrotask(() =>
          setDraggedId(String(event.operation.source?.id ?? "") || null),
        );
      }}
      onDragEnd={(event) => {
        if (!props.canManage) return;
        const entityId = String(event.operation.source?.id ?? "");
        const data = event.operation.target?.data;
        queueMicrotask(() => {
          setDraggedId(null);
          if (event.canceled || !entityId || !isLibraryDropData(data)) return;
          setPendingId(entityId);
          void props
            .onMoveEntity({
              entityId,
              targetId: data.entityId,
              placement: data.placement,
            })
            .then(() => {
              if (data.placement !== "inside" || !data.entityId) return;
              setExpanded((current) => new Set(current).add(data.entityId!));
            })
            .catch((error) => {
              toast.error(
                error instanceof Error ? error.message : "Failed to move item",
              );
            })
            .finally(() => setPendingId(null));
        });
      }}
    >
      <div
        className="flex h-full min-h-0 flex-col"
        role="tree"
        aria-label="Library files"
      >
        <div className="flex h-10 shrink-0 items-center justify-between border-b bg-muted/70 px-2 text-foreground">
          <span className="truncate pl-1 text-xs font-medium">
            {props.title}
          </span>
          {props.canManage ? (
            <div className="flex gap-1">
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label="Upload files"
                disabled={props.uploadDisabled}
                onClick={props.onUploadFiles}
              >
                <HugeiconsIcon icon={Upload01Icon} />
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label="New folder"
                onClick={() =>
                  void props.onCreateFolder(
                    "Untitled folder",
                    props.currentFolderId ?? undefined,
                  )
                }
              >
                <HugeiconsIcon icon={FolderAddIcon} />
              </Button>
            </div>
          ) : null}
        </div>
        <div
          className={cn(
            "min-h-0 flex-1 flex-col overflow-auto px-1 pt-px pb-2",
            rows.length > 0 && "flex",
            appSidebarRowGapClassName,
          )}
        >
          {rows.length > 0 ? (
            rows.map((node) => (
              <LibraryTreeRow
                key={node.id}
                node={node}
                expanded={expanded.has(node.id)}
                canManage={props.canManage}
                allowDownloads={props.allowDownloads}
                dragActive={draggedId !== null}
                dragDisabled={pendingId !== null}
                dropDisabled={invalidDropIds.has(node.id)}
                renaming={renamingId === node.id}
                selected={props.selectedEntityId === node.id}
                onToggle={() =>
                  setExpanded((current) => {
                    const next = new Set(current);
                    next.has(node.id)
                      ? next.delete(node.id)
                      : next.add(node.id);
                    return next;
                  })
                }
                onOpen={() => props.onOpenEntity(node.data)}
                onRename={() => setRenamingId(node.id)}
                onRenameSave={async (name: string) => {
                  await props.onRenameEntity(node.data, name);
                  setRenamingId(null);
                }}
                onRenameCancel={() => setRenamingId(null)}
                onCopy={() => void props.onCopyLink(node.data)}
                onDownload={() => props.onDownloadFile(node.data)}
                onDelete={() => props.onDeleteEntity(node.data)}
              />
            ))
          ) : (
            <Empty className="h-full min-h-32 rounded-none p-4">
              <EmptyHeader>
                <EmptyTitle className="font-normal text-muted-foreground">
                  No files yet
                </EmptyTitle>
              </EmptyHeader>
            </Empty>
          )}
        </div>
        {props.canManage ? (
          <LibraryRootDropZone
            active={draggedId !== null}
            disabled={pendingId !== null}
          />
        ) : null}
      </div>
      <DragOverlay>
        {draggedEntity ? <LibraryDragPreview entity={draggedEntity} /> : null}
      </DragOverlay>
    </DragDropProvider>
  );
}

function LibraryTreeRow({
  node,
  expanded,
  canManage,
  allowDownloads,
  dragActive,
  dragDisabled,
  dropDisabled,
  renaming,
  selected,
  onToggle,
  onOpen,
  onRename,
  onRenameSave,
  onRenameCancel,
  onCopy,
  onDownload,
  onDelete,
}: {
  node: ProjectedTreeNode<LibraryEntity>;
  expanded: boolean;
  canManage: boolean;
  allowDownloads: boolean;
  dragActive: boolean;
  dragDisabled: boolean;
  dropDisabled: boolean;
  renaming: boolean;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onRename: () => void;
  onRenameSave: (name: string) => Promise<void>;
  onRenameCancel: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const folder = node.data.kind === "folder";
  const { ref, handleRef, isDragging } = useDraggable({
    id: node.id,
    disabled: !canManage || dragDisabled || renaming,
    data: { kind: "library-tree-entity", entityId: node.id },
  });
  return (
    <ContextMenu modal={false}>
      <div
        className="contents"
        onContextMenu={(event) => event.stopPropagation()}
      >
        <ContextMenuTrigger asChild>
          <div
            ref={(element) => {
              ref(element);
              handleRef(element);
            }}
            role="treeitem"
            tabIndex={0}
            aria-level={node.depth + 1}
            aria-expanded={folder ? expanded : undefined}
            aria-selected={selected}
            data-selected={selected}
            className={cn(
              "group/library relative flex min-w-0 items-center gap-1.5 rounded-md pe-2 text-xs font-normal text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[selected=true]:bg-accent data-[selected=true]:font-medium data-[selected=true]:text-foreground",
              appSidebarRowHeightClassName,
              isDragging && "opacity-30",
            )}
            style={{
              paddingInlineStart: getAppSidebarTreePaddingInlineStart(
                node.depth,
              ),
            }}
          >
            <LibraryDropZones
              active={dragActive}
              disabled={dropDisabled}
              entityId={node.id}
              insideEnabled={folder}
            />
            <span className={cn("relative", appSidebarIconSlotClassName)}>
              {folder ? (
                <>
                  <HugeiconsIcon
                    aria-hidden
                    icon={Folder01Icon}
                    className="size-3.5 shrink-0 transition-opacity duration-100 group-hover/library:opacity-0 group-focus-within/library:opacity-0 pointer-coarse:opacity-0"
                    strokeWidth={1.75}
                  />
                  <button
                    type="button"
                    aria-label={expanded ? "Collapse" : "Expand"}
                    className="absolute inset-0 z-30 flex items-center justify-center rounded-sm opacity-0 outline-none transition-opacity duration-100 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring group-hover/library:opacity-100 pointer-coarse:opacity-100"
                    onClick={onToggle}
                  >
                    <HugeiconsIcon
                      aria-hidden
                      icon={ArrowRight01Icon}
                      className={cn(
                        "size-3.5 transition-transform duration-150 motion-reduce:transition-none",
                        expanded && "rotate-90",
                      )}
                      strokeWidth={1.75}
                    />
                  </button>
                </>
              ) : node.data.kind === "file" ? (
                <LibraryFileIcon
                  contentType={node.data.file.contentType}
                  filename={node.data.file.filename}
                />
              ) : null}
            </span>
            {renaming ? (
              <InlineRename
                label={`Rename ${node.label}`}
                value={node.label}
                onCancel={onRenameCancel}
                onSave={onRenameSave}
              />
            ) : (
              <button
                type="button"
                className="h-full min-w-0 flex-1 truncate text-left outline-none"
                onDoubleClick={canManage ? onRename : undefined}
                onClick={onOpen}
              >
                <MiddleTruncate text={node.label} />
              </button>
            )}
          </div>
        </ContextMenuTrigger>
      </div>
      <ContextMenuContent className="w-52">
        {!folder ? (
          <>
            <ContextMenuLabel className="max-w-full truncate font-normal text-muted-foreground">
              {node.data.kind === "file"
                ? formatFileSize(node.data.file.size)
                : null}
            </ContextMenuLabel>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={onCopy}>
              <HugeiconsIcon icon={Link01Icon} />
              Copy link
            </ContextMenuItem>
            {allowDownloads ? (
              <ContextMenuItem onSelect={onDownload}>
                <HugeiconsIcon icon={Download01Icon} />
                Download
              </ContextMenuItem>
            ) : null}
          </>
        ) : null}
        {canManage ? (
          <>
            <ContextMenuItem onSelect={onRename}>
              <HugeiconsIcon icon={PencilEdit01Icon} />
              Rename
            </ContextMenuItem>
            <ContextMenuItem onSelect={onDelete} variant="destructive">
              <HugeiconsIcon icon={Delete01Icon} />
              Delete
            </ContextMenuItem>
          </>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
}

function LibraryDropZones({
  active,
  disabled,
  entityId,
  insideEnabled,
}: {
  active: boolean;
  disabled: boolean;
  entityId: string;
  insideEnabled: boolean;
}) {
  return (
    <>
      <LibraryDropZone
        active={active}
        disabled={disabled}
        entityId={entityId}
        placement="before"
      />
      {insideEnabled ? (
        <LibraryDropZone
          active={active}
          disabled={disabled}
          entityId={entityId}
          placement="inside"
        />
      ) : null}
      <LibraryDropZone
        active={active}
        disabled={disabled}
        entityId={entityId}
        placement="after"
      />
    </>
  );
}

function LibraryDropZone({
  active,
  disabled,
  entityId,
  placement,
}: {
  active: boolean;
  disabled: boolean;
  entityId: string;
  placement: "before" | "after" | "inside";
}) {
  const { ref, isDropTarget } = useDroppable<LibraryDropData>({
    id: `library-drop:${placement}:${entityId}`,
    disabled,
    data: { kind: "library-tree-drop", entityId, placement },
    collisionDetector: closestCenter,
  });
  return (
    <div
      ref={ref}
      className={cn(
        "pointer-events-none absolute inset-x-0 z-20",
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

function LibraryRootDropZone({
  active,
  disabled,
}: {
  active: boolean;
  disabled: boolean;
}) {
  const { ref, isDropTarget } = useDroppable<LibraryDropData>({
    id: "library-drop:root-end",
    disabled,
    data: { kind: "library-tree-drop", entityId: null, placement: "root-end" },
    collisionDetector: closestCenter,
  });
  return (
    <div
      ref={ref}
      className={cn(
        "pointer-events-none relative h-3",
        active && !disabled && "pointer-events-auto h-8",
        isDropTarget &&
          "after:absolute after:inset-x-1 after:top-2 after:h-0.5 after:rounded-full after:bg-primary",
      )}
    />
  );
}

function LibraryDragPreview({ entity }: { entity: LibraryEntity }) {
  const label =
    entity.kind === "folder" ? entity.folder.name : entity.file.filename;
  return (
    <div className="flex h-9 max-w-64 items-center gap-2 rounded-lg border bg-background px-3 text-sm shadow-xl">
      <HugeiconsIcon
        icon={DragDropVerticalIcon}
        className="size-3.5 shrink-0 text-muted-foreground"
      />
      <span className="truncate">{label}</span>
    </div>
  );
}
