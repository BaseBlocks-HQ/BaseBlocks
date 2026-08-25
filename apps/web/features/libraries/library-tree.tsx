"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowReloadHorizontalIcon,
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
import type {
  FolderId,
  LibraryEntity,
  LibraryFile,
} from "@/features/libraries/model";
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
import { type ReactNode, useState } from "react";
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
  onRetryExtraction: (file: LibraryFile) => void;
  onUploadFiles: () => void;
  selectedEntityId: string | null;
  title?: string;
  uploadDisabled?: boolean;
  headerContent?: ReactNode;
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
        <div className="flex h-10 shrink-0 items-center justify-between border-b bg-muted/70 px-3 text-foreground">
          <span className="truncate text-xs font-medium">{props.title}</span>
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
        {props.headerContent ? (
          <div className="shrink-0 border-b p-2">{props.headerContent}</div>
        ) : null}
        <div
          className={cn(
            "min-h-0 flex-1 flex-col overflow-auto px-1 pb-2",
            rows.length > 0 && "flex",
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
                onRetry={() => {
                  if (node.data.kind === "file") {
                    props.onRetryExtraction(node.data.file);
                  }
                }}
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
  onRetry,
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
  onRetry: () => void;
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
              "group/library relative flex h-8 shrink-0 min-w-0 items-center gap-1 rounded-md px-1 pe-2 text-sm font-normal text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[selected=true]:bg-accent data-[selected=true]:font-medium data-[selected=true]:text-foreground",
              isDragging && "opacity-30",
            )}
            style={{
              paddingInlineStart: node.depth * 16 + 4,
            }}
          >
            <LibraryDropZones
              active={dragActive}
              disabled={dropDisabled}
              entityId={node.id}
              insideEnabled={folder}
            />
            {folder ? (
              <button
                type="button"
                aria-label={expanded ? "Collapse" : "Expand"}
                className="flex size-4 shrink-0 items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                onClick={onToggle}
              >
                <HugeiconsIcon
                  aria-hidden
                  icon={expanded ? ArrowDown01Icon : ArrowRight01Icon}
                  className="size-4"
                  strokeWidth={1.75}
                />
              </button>
            ) : (
              <span aria-hidden className="size-4 shrink-0" />
            )}
            {folder ? (
              <HugeiconsIcon
                aria-hidden
                icon={Folder01Icon}
                className="size-4 shrink-0"
                strokeWidth={1.75}
              />
            ) : node.data.kind === "file" ? (
              <LibraryFileIcon
                className="size-4"
                contentType={node.data.file.contentType}
                filename={node.data.file.filename}
              />
            ) : null}
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
                className="h-full min-w-0 flex-1 truncate text-left text-sm outline-none"
                onDoubleClick={canManage ? onRename : undefined}
                onClick={onOpen}
              >
                <MiddleTruncate text={node.label} />
              </button>
            )}
            {!folder && node.data.kind === "file" ? (
              <ExtractionStatus file={node.data.file} onRetry={onRetry} />
            ) : null}
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
            <ContextMenuItem onSelect={onRetry}>
              <HugeiconsIcon icon={ArrowReloadHorizontalIcon} />
              Retry extraction
            </ContextMenuItem>
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

function ExtractionStatus({
  file,
  onRetry,
}: {
  file: LibraryFile;
  onRetry: () => void;
}) {
  const status = file.extractionStatus ?? "missing";
  const details = {
    queued: {
      label: "Queued",
      color: "bg-amber-500",
      className: "text-amber-700 dark:text-amber-300",
    },
    processing: {
      label: "Processing",
      color: "bg-blue-500",
      className: "text-blue-700 dark:text-blue-300",
    },
    ready: {
      label: "Ready",
      color: "bg-emerald-500",
      className: "text-emerald-700 dark:text-emerald-300",
    },
    failed: {
      label: "Failed",
      color: "bg-destructive",
      className: "text-destructive",
    },
    missing: {
      label: "Not indexed",
      color: "bg-muted-foreground",
      className: "text-muted-foreground",
    },
  }[status];
  const retryable = status === "failed" || status === "missing";
  const ariaLabel = file.extractionFailure
    ? `${details.label}: ${file.extractionFailure}`
    : details.label;

  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "flex shrink-0 items-center gap-1 text-[10px] font-medium uppercase tracking-wide",
        details.className,
      )}
      title={file.extractionFailure ?? details.label}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          details.color,
          status === "processing" && "animate-pulse",
        )}
      />
      <span className="hidden sm:inline">{details.label}</span>
      {retryable ? (
        <Button
          aria-label={`Retry extraction for ${file.filename}`}
          className="h-5 rounded px-1.5 text-[10px] uppercase tracking-wide"
          onClick={(event) => {
            event.stopPropagation();
            onRetry();
          }}
          size="xs"
          type="button"
          variant="ghost"
        >
          Retry
        </Button>
      ) : null}
    </div>
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
