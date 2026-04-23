"use client";

import { cn } from "@/lib/utils";
import type { FolderId, LibraryEntity } from "@/modules/library/types";
import type {
  ContextMenuOpenContext,
  FileTreeCompositionOptions,
  FileTreeDropResult,
  FileTree as FileTreeModel,
} from "@pierre/trees";
import { FileTree, useFileTree, useFileTreeSearch } from "@pierre/trees/react";
import { FolderPlus, ListTree, Search, Upload } from "lucide-react";
import {
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const treeComposition = {
  contextMenu: {
    buttonVisibility: "when-needed",
    enabled: true,
    triggerMode: "both",
  },
} satisfies FileTreeCompositionOptions;

const treeUnsafeCSS = `
  [data-type='item'] {
    box-sizing: border-box;
    transition:
      background-color 120ms ease,
      color 120ms ease,
      box-shadow 120ms ease;
    width: 100%;
  }

  [data-type='item']:hover {
    color: var(--trees-selected-fg);
  }

  [data-file-tree-search-container][data-open='false'] {
    display: none;
  }

  [data-item-section='content'] {
    flex: 1 1 auto;
  }

  [data-item-section='decoration']:empty {
    display: none;
  }

  [data-truncate-group-container='middle'] {
    width: 100%;
  }

  [data-truncate-group-container='middle'] > [data-truncate-segment-priority='2'] {
    flex: 1 1 auto;
  }

  [data-truncate-group-container='middle'] > [data-truncate-segment-priority='1'] {
    flex: 0 0 auto;
  }

  [data-type='item'] > [data-item-section='spacing'] {
    order: 0;
  }

  [data-type='item'] > [data-item-section='icon'] {
    order: 1;
  }

  [data-type='item'] > [data-item-section='content'] {
    display: none;
  }

  [data-type='item']::after {
    content: attr(aria-label);
    order: 2;
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  [data-type='item'] > [data-item-section='decoration'] {
    order: 3;
  }

  [data-type='item'] > [data-item-section='action'] {
    order: 4;
  }
`;

const treePanelStyle = {
  colorScheme: "light dark",
  height: "100%",
  minHeight: 0,
  width: "100%",
  "--trees-accent-override": "var(--primary)",
  "--trees-bg-override": "transparent",
  "--trees-bg-muted-override":
    "color-mix(in oklab, var(--primary) 7%, transparent)",
  "--trees-border-color-override": "transparent",
  "--trees-focus-ring-color-override": "var(--ring)",
  "--trees-search-bg-override":
    "color-mix(in oklab, var(--primary) 6%, var(--background))",
  "--trees-selected-bg-override":
    "color-mix(in oklab, var(--primary) 10%, transparent)",
  "--trees-selected-focused-border-color-override":
    "color-mix(in oklab, var(--primary) 42%, transparent)",
} as const;

export function LibraryTree({
  allowDownloads,
  canManage,
  entities,
  onCreateFolder,
  onDeleteEntity,
  onDownloadFile,
  onDropEntities,
  onMoveEntity,
  onOpenEntity,
  onRenameEntity,
  onUploadFiles,
  paths,
  title,
  uploadDisabled,
}: {
  allowDownloads: boolean;
  canManage: boolean;
  entities: Map<string, LibraryEntity>;
  onCreateFolder: () => void;
  onDeleteEntity: (entity: LibraryEntity) => void;
  onDownloadFile: (entity: LibraryEntity) => void;
  onDropEntities?: (
    entities: LibraryEntity[],
    targetFolderId: FolderId | undefined,
  ) => Promise<void>;
  onMoveEntity: (entity: LibraryEntity) => void;
  onOpenEntity: (entity: LibraryEntity) => void;
  onRenameEntity: (entity: LibraryEntity) => void;
  onUploadFiles: () => void;
  paths: string[];
  title?: string;
  uploadDisabled?: boolean;
}) {
  const [flattenEmptyDirectories, setFlattenEmptyDirectories] = useState(false);

  return (
    <LibraryTreeModel
      key={flattenEmptyDirectories ? "flat" : "tree"}
      allowDownloads={allowDownloads}
      canManage={canManage}
      entities={entities}
      flattenEmptyDirectories={flattenEmptyDirectories}
      onCreateFolder={onCreateFolder}
      onDeleteEntity={onDeleteEntity}
      onDownloadFile={onDownloadFile}
      onDropEntities={onDropEntities}
      onMoveEntity={onMoveEntity}
      onOpenEntity={onOpenEntity}
      onRenameEntity={onRenameEntity}
      onToggleFlatten={() => setFlattenEmptyDirectories((value) => !value)}
      onUploadFiles={onUploadFiles}
      paths={paths}
      title={title}
      uploadDisabled={uploadDisabled}
    />
  );
}

function LibraryTreeModel({
  allowDownloads,
  canManage,
  entities,
  flattenEmptyDirectories,
  onCreateFolder,
  onDeleteEntity,
  onDownloadFile,
  onDropEntities,
  onMoveEntity,
  onOpenEntity,
  onRenameEntity,
  onToggleFlatten,
  onUploadFiles,
  paths,
  title,
  uploadDisabled,
}: {
  allowDownloads: boolean;
  canManage: boolean;
  entities: Map<string, LibraryEntity>;
  flattenEmptyDirectories: boolean;
  onCreateFolder: () => void;
  onDeleteEntity: (entity: LibraryEntity) => void;
  onDownloadFile: (entity: LibraryEntity) => void;
  onDropEntities?: (
    entities: LibraryEntity[],
    targetFolderId: FolderId | undefined,
  ) => Promise<void>;
  onMoveEntity: (entity: LibraryEntity) => void;
  onOpenEntity: (entity: LibraryEntity) => void;
  onRenameEntity: (entity: LibraryEntity) => void;
  onToggleFlatten: () => void;
  onUploadFiles: () => void;
  paths: string[];
  title?: string;
  uploadDisabled?: boolean;
}) {
  const [initialPaths] = useState(() => paths);
  const entitiesRef = useRef(entities);
  const modelRef = useRef<FileTreeModel | null>(null);
  const onDropEntitiesRef = useRef(onDropEntities);
  const onOpenEntityRef = useRef(onOpenEntity);
  const pathsRef = useRef(paths);

  const { model } = useFileTree({
    composition: treeComposition,
    density: "compact",
    dragAndDrop:
      canManage && onDropEntities
        ? {
            canDrag: (draggedPaths) =>
              draggedPaths.every((path) => entitiesRef.current.has(path)),
            onDropComplete: (event) => {
              const draggedEntities = resolveDroppedEntities(
                event,
                entitiesRef.current,
              );
              const targetFolderId = resolveDropTargetFolderId(
                event,
                entitiesRef.current,
              );

              void onDropEntitiesRef
                .current?.(draggedEntities, targetFolderId)
                .catch(() => {
                  modelRef.current?.resetPaths(pathsRef.current);
                });
            },
            onDropError: () => {
              modelRef.current?.resetPaths(pathsRef.current);
            },
          }
        : false,
    fileTreeSearchMode: "hide-non-matches",
    flattenEmptyDirectories,
    icons: { colored: true, set: "complete" },
    initialExpansion: "open",
    paths: initialPaths,
    search: true,
    searchBlurBehavior: "retain",
    stickyFolders: true,
    unsafeCSS: treeUnsafeCSS,
    onSelectionChange: (selectedPaths) => {
      const selectedPath = selectedPaths.at(-1);
      if (!selectedPath) return;
      const entity = entitiesRef.current.get(selectedPath);
      if (entity) onOpenEntityRef.current(entity);
    },
  });
  const search = useFileTreeSearch(model);

  useEffect(() => {
    entitiesRef.current = entities;
    modelRef.current = model;
    onDropEntitiesRef.current = onDropEntities;
    onOpenEntityRef.current = onOpenEntity;
    pathsRef.current = paths;
  }, [entities, model, onDropEntities, onOpenEntity, paths]);

  useEffect(() => {
    model.resetPaths(paths);
  }, [model, paths]);

  const openEntityFromEvent = (event: ReactMouseEvent<HTMLElement>) => {
    const path = event.nativeEvent.composedPath();
    if (
      path.some(
        (target) =>
          target instanceof HTMLElement &&
          target.dataset.type === "context-menu-trigger",
      )
    ) {
      return;
    }

    const row = path.find(
      (target) =>
        target instanceof HTMLElement &&
        (target.dataset.type === "item" ||
          target.dataset.fileTreeStickyRow === "true"),
    );
    if (!(row instanceof HTMLElement)) return;

    const entityPath = row.dataset.itemPath ?? row.dataset.fileTreeStickyPath;
    if (!entityPath) return;

    const entity = entities.get(entityPath);
    if (entity) onOpenEntity(entity);
  };

  return (
    <FileTree
      aria-label="Library files"
      className="h-full min-h-0 overflow-auto"
      header={
        <LibraryTreeHeader
          canManage={canManage}
          flattenEmptyDirectories={flattenEmptyDirectories}
          onCreateFolder={onCreateFolder}
          onToggleSearch={() => {
            if (search.isOpen) search.close();
            else search.open();
          }}
          onToggleFlatten={onToggleFlatten}
          onUploadFiles={onUploadFiles}
          searchOpen={search.isOpen}
          title={title}
          uploadDisabled={uploadDisabled}
        />
      }
      model={model}
      onClick={openEntityFromEvent}
      renderContextMenu={(item, context) => {
        const entity = entities.get(item.path);
        if (!entity) return null;

        return (
          <LibraryTreeContextMenu
            allowDownloads={allowDownloads}
            canManage={canManage}
            context={context}
            entity={entity}
            onDelete={() => onDeleteEntity(entity)}
            onDownload={() => onDownloadFile(entity)}
            onMove={() => onMoveEntity(entity)}
            onOpen={() => onOpenEntity(entity)}
            onRename={() => onRenameEntity(entity)}
          />
        );
      }}
      style={treePanelStyle}
    />
  );
}

function resolveDroppedEntities(
  event: FileTreeDropResult,
  entities: Map<string, LibraryEntity>,
) {
  return event.draggedPaths.flatMap((path) => {
    const entity = entities.get(path);
    return entity ? [entity] : [];
  });
}

function resolveDropTargetFolderId(
  event: FileTreeDropResult,
  entities: Map<string, LibraryEntity>,
) {
  if (event.target.kind === "root") return undefined;
  const targetPath =
    event.target.directoryPath ?? event.target.flattenedSegmentPath;
  if (!targetPath) return undefined;

  const target = entities.get(targetPath);
  return target?.kind === "folder" ? target.folder._id : undefined;
}

function LibraryTreeHeader({
  canManage,
  flattenEmptyDirectories,
  onCreateFolder,
  onToggleSearch,
  onToggleFlatten,
  onUploadFiles,
  searchOpen,
  title,
  uploadDisabled,
}: {
  canManage: boolean;
  flattenEmptyDirectories: boolean;
  onCreateFolder: () => void;
  onToggleSearch: () => void;
  onToggleFlatten: () => void;
  onUploadFiles: () => void;
  searchOpen: boolean;
  title?: string;
  uploadDisabled?: boolean;
}) {
  return (
    <div className="group/tree-header flex h-10 items-center justify-between gap-2 bg-transparent px-2">
      <div className="flex min-w-0 items-center gap-2 pl-1">
        {title ? (
          <span className="truncate text-xs font-medium text-foreground">
            {title}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <TreeHeaderButton
          label={searchOpen ? "Close search" : "Search files"}
          onClick={onToggleSearch}
          pressed={searchOpen}
        >
          <Search className="h-3.5 w-3.5" />
        </TreeHeaderButton>
        <TreeHeaderButton
          label={
            flattenEmptyDirectories
              ? "Show folder levels"
              : "Flatten empty folders"
          }
          onClick={onToggleFlatten}
          pressed={flattenEmptyDirectories}
        >
          <ListTree className="h-3.5 w-3.5" />
        </TreeHeaderButton>
        {canManage ? (
          <>
            <TreeHeaderButton
              disabled={uploadDisabled}
              label="Upload files"
              onClick={onUploadFiles}
            >
              <Upload className="h-3.5 w-3.5" />
            </TreeHeaderButton>
            <TreeHeaderButton label="New folder" onClick={onCreateFolder}>
              <FolderPlus className="h-3.5 w-3.5" />
            </TreeHeaderButton>
          </>
        ) : null}
      </div>
    </div>
  );
}

function TreeHeaderButton({
  children,
  disabled,
  label,
  onClick,
  pressed,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary focus-visible:bg-primary/5 focus-visible:text-primary focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40",
        pressed && "bg-primary/10 text-primary",
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
    >
      {children}
    </button>
  );
}

function LibraryTreeContextMenu({
  allowDownloads,
  canManage,
  context,
  entity,
  onDelete,
  onDownload,
  onMove,
  onOpen,
  onRename,
}: {
  allowDownloads: boolean;
  canManage: boolean;
  context: ContextMenuOpenContext;
  entity: LibraryEntity;
  onDelete: () => void;
  onDownload: () => void;
  onMove: () => void;
  onOpen: () => void;
  onRename: () => void;
}) {
  const runAction = (action: () => void) => {
    action();
    context.close({ restoreFocus: true });
  };
  const rect = context.anchorRect;
  const width = 176;
  const left =
    typeof window === "undefined"
      ? rect.left
      : Math.min(rect.left, window.innerWidth - width - 8);
  const top =
    typeof window === "undefined"
      ? rect.bottom
      : Math.min(rect.bottom + 4, window.innerHeight - 210);

  return createPortal(
    <div
      data-file-tree-context-menu-root="true"
      role="menu"
      className="fixed z-50 min-w-44 rounded-md bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-border/80"
      style={{ left, top }}
    >
      <MenuItem onClick={() => runAction(onOpen)}>Open</MenuItem>
      {entity.kind === "file" && allowDownloads ? (
        <MenuItem onClick={() => runAction(onDownload)}>Download</MenuItem>
      ) : null}
      {canManage ? (
        <>
          <MenuItem onClick={() => runAction(onRename)}>Rename</MenuItem>
          <MenuItem onClick={() => runAction(onMove)}>Move</MenuItem>
          <MenuItem destructive onClick={() => runAction(onDelete)}>
            Delete
          </MenuItem>
        </>
      ) : null}
    </div>,
    document.body,
  );
}

function MenuItem({
  children,
  destructive,
  onClick,
}: {
  children: React.ReactNode;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex h-8 w-full items-center rounded-sm px-2 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        destructive &&
          "text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
