"use client";

import type { FolderId, LibraryEntity } from "@/features/libraries/model";
import { InlineRename } from "@/components/tree/inline-rename";
import {
  projectTree,
  type TreeDropPlacement,
  type TreeNode,
} from "@baseblocks/domain";
import { cn } from "@baseblocks/ui/lib/utils";
import { Button } from "@baseblocks/ui/button";
import { closestCenter } from "@dnd-kit/collision";
import {
  DragDropProvider,
  DragOverlay,
  useDraggable,
  useDroppable,
} from "@dnd-kit/react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  File,
  Folder,
  FolderPlus,
  GripVertical,
  Link,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type LibraryDropData = {
  kind: "library-tree-drop";
  entityId: string | null;
  placement: TreeDropPlacement;
};

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

function descendantIds(
  nodes: TreeNode<LibraryEntity>[],
  nodeId: string | null,
) {
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
  const rows = projectTree(props.nodes, expanded);
  const draggedEntity = draggedId
    ? (props.nodes.find((node) => node.id === draggedId)?.data ?? null)
    : null;
  const invalidDropIds = descendantIds(props.nodes, draggedId);
  return (
    <DragDropProvider
      onDragStart={(event) => {
        if (!props.canManage) return;
        setDraggedId(String(event.operation.source?.id ?? "") || null);
      }}
      onDragEnd={(event) => {
        if (!props.canManage) return;
        const entityId = String(event.operation.source?.id ?? "");
        const data = event.operation.target?.data;
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
                <Upload />
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
                <FolderPlus />
              </Button>
            </div>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-1 pb-2">
          {rows.map((node) => (
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
              onToggle={() =>
                setExpanded((current) => {
                  const next = new Set(current);
                  next.has(node.id) ? next.delete(node.id) : next.add(node.id);
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
          ))}
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
  onToggle,
  onOpen,
  onRename,
  onRenameSave,
  onRenameCancel,
  onCopy,
  onDownload,
  onDelete,
}: {
  node: ReturnType<typeof projectTree<LibraryEntity>>[number];
  expanded: boolean;
  canManage: boolean;
  allowDownloads: boolean;
  dragActive: boolean;
  dragDisabled: boolean;
  dropDisabled: boolean;
  renaming: boolean;
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
    <div
      ref={ref}
      role="treeitem"
      tabIndex={0}
      aria-level={node.depth + 1}
      aria-expanded={folder ? expanded : undefined}
      className={cn(
        "group relative flex h-8 items-center gap-1 rounded-md px-1 hover:bg-accent",
        isDragging && "opacity-30",
      )}
      style={{ paddingLeft: node.depth * 16 + 4 }}
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
          onClick={onToggle}
        >
          {expanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>
      ) : (
        <span className="w-4" />
      )}
      {folder ? (
        <Folder className="size-4 shrink-0" />
      ) : (
        <File className="size-4 shrink-0" />
      )}
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
          className="min-w-0 flex-1 truncate text-left text-sm"
          onDoubleClick={canManage ? onRename : undefined}
          onClick={onOpen}
        >
          {node.label}
        </button>
      )}
      <div className="relative z-30 hidden items-center gap-0.5 group-hover:flex group-focus-within:flex">
        {canManage ? (
          <button
            ref={handleRef}
            type="button"
            aria-label={`Move ${node.label}`}
            className="relative z-30 flex size-7 cursor-grab items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
          >
            <GripVertical className="size-3.5" />
          </button>
        ) : null}
        {!folder ? (
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Copy link"
            onClick={onCopy}
          >
            <Link />
          </Button>
        ) : null}
        {!folder && allowDownloads ? (
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Download"
            onClick={onDownload}
          >
            <Download />
          </Button>
        ) : null}
        {canManage ? (
          <>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="Rename"
              onClick={onRename}
            >
              <Pencil />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="Delete"
              onClick={onDelete}
            >
              <Trash2 />
            </Button>
          </>
        ) : null}
      </div>
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
      <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{label}</span>
    </div>
  );
}
