"use client";

import type { FolderId, LibraryEntity } from "@/features/libraries/tree-input";
import { InlineRename } from "@/components/tree/inline-rename";
import {
  projectTree,
  type TreeNode,
  wouldCreateCycle,
} from "@/components/tree/model";
import { Button } from "@baseblocks/ui/button";
import { cn } from "@baseblocks/ui/lib/utils";
import { DragDropProvider, useDraggable, useDroppable } from "@dnd-kit/react";
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
import { useMemo, useState } from "react";

export function LibraryTree(props: {
  allowDownloads: boolean;
  canManage: boolean;
  currentFolderId: FolderId | null;
  nodes: TreeNode<LibraryEntity>[];
  onCopyLink: (entity: LibraryEntity) => Promise<void> | void;
  onCreateFolder: (name: string, parentId?: FolderId) => Promise<void>;
  onDeleteEntity: (entity: LibraryEntity) => void;
  onDownloadFile: (entity: LibraryEntity) => void;
  onDropEntities?: (
    entities: LibraryEntity[],
    targetFolderId: FolderId | undefined,
  ) => Promise<void>;
  onOpenEntity: (entity: LibraryEntity) => void;
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
  const rows = useMemo(
    () => projectTree(props.nodes, expanded),
    [props.nodes, expanded],
  );
  const byId = useMemo(
    () => new Map(props.nodes.map((node) => [node.id, node])),
    [props.nodes],
  );

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        const sourceId = String(event.operation.source?.id ?? "");
        const targetId = String(event.operation.target?.id ?? "");
        const source = byId.get(sourceId);
        const target = byId.get(targetId);
        if (!source || !target || !props.onDropEntities) return;
        const parentId =
          target.data.kind === "folder" ? target.id : target.parentId;
        if (
          source.data.kind === "folder" &&
          wouldCreateCycle(props.nodes, source.id, parentId)
        )
          return;
        void props.onDropEntities(
          [source.data],
          parentId as FolderId | undefined,
        );
      }}
    >
      <div
        className="flex h-full min-h-0 flex-col"
        role="tree"
        aria-label="Library files"
      >
        <div className="flex h-10 shrink-0 items-center justify-between px-2">
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
      </div>
    </DragDropProvider>
  );
}

function LibraryTreeRow({
  node,
  expanded,
  canManage,
  allowDownloads,
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
  const {
    ref: dragRef,
    handleRef,
    isDragging,
  } = useDraggable({
    id: node.id,
    disabled: !canManage,
    data: { nodeId: node.id },
  });
  const { ref: dropRef, isDropTarget } = useDroppable({
    id: node.id,
    disabled: !canManage,
    data: { nodeId: node.id },
  });
  const folder = node.data.kind === "folder";
  return (
    <div
      ref={(element) => {
        dragRef(element);
        dropRef(element);
      }}
      role="treeitem"
      tabIndex={0}
      aria-level={node.depth + 1}
      aria-expanded={folder ? expanded : undefined}
      className={cn(
        "group flex h-8 items-center gap-1 rounded-md px-1 hover:bg-accent",
        isDragging && "opacity-40",
        isDropTarget && "ring-2 ring-primary/40",
      )}
      style={{ paddingLeft: node.depth * 16 + 4 }}
    >
      {canManage ? (
        <button
          ref={handleRef}
          type="button"
          aria-label={`Move ${node.label}`}
          className="cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100"
        >
          <GripVertical className="size-3.5" />
        </button>
      ) : null}
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
      <div className="hidden items-center gap-0.5 group-hover:flex">
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
