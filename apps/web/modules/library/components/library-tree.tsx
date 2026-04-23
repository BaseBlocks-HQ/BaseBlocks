"use client";

import { cn } from "@/lib/utils";
import {
  type LibraryTreeViewMode,
  buildDraftFolderViewPath,
  buildLibraryTreeView,
  buildLibraryTreeViewLookup,
  getLibraryTreeViewLookupPath,
  getLibraryTreeViewNameFromPath,
} from "@/modules/library/model/library-tree-view";
import type { FolderId, LibraryEntity } from "@/modules/library/types";
import type {
  ContextMenuOpenContext,
  FileTreeCompositionOptions,
  FileTreeDropResult,
  FileTree as FileTreeModel,
} from "@pierre/trees";
import { FileTree, useFileTree, useFileTreeSearch } from "@pierre/trees/react";
import {
  Download,
  FolderInput,
  FolderOpen,
  FolderPlus,
  ListTree,
  Pencil,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import {
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

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
    min-width: 0;
  }

  [data-item-section='decoration']:empty {
    display: none;
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
  currentFolderId,
  currentFolderPath,
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
  currentFolderId: FolderId | null;
  currentFolderPath: string | null;
  entities: Map<string, LibraryEntity>;
  onCreateFolder: (name: string, parentId?: FolderId) => Promise<void>;
  onDeleteEntity: (entity: LibraryEntity) => void;
  onDownloadFile: (entity: LibraryEntity) => void;
  onDropEntities?: (
    entities: LibraryEntity[],
    targetFolderId: FolderId | undefined,
  ) => Promise<void>;
  onMoveEntity: (entity: LibraryEntity) => void;
  onOpenEntity: (entity: LibraryEntity) => void;
  onRenameEntity: (entity: LibraryEntity, name: string) => Promise<void>;
  onUploadFiles: () => void;
  paths: string[];
  title?: string;
  uploadDisabled?: boolean;
}) {
  const [mode, setMode] = useState<LibraryTreeViewMode>("tree");

  return (
    <LibraryTreeModel
      key={mode}
      allowDownloads={allowDownloads}
      canManage={canManage}
      currentFolderId={currentFolderId}
      currentFolderPath={currentFolderPath}
      entities={entities}
      mode={mode}
      onCreateFolder={onCreateFolder}
      onDeleteEntity={onDeleteEntity}
      onDownloadFile={onDownloadFile}
      onDropEntities={onDropEntities}
      onMoveEntity={onMoveEntity}
      onOpenEntity={onOpenEntity}
      onRenameEntity={onRenameEntity}
      onToggleMode={() =>
        setMode((value) => (value === "tree" ? "flat" : "tree"))
      }
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
  currentFolderId,
  currentFolderPath,
  entities,
  mode,
  onCreateFolder,
  onDeleteEntity,
  onDownloadFile,
  onDropEntities,
  onMoveEntity,
  onOpenEntity,
  onRenameEntity,
  onToggleMode,
  onUploadFiles,
  paths,
  title,
  uploadDisabled,
}: {
  allowDownloads: boolean;
  canManage: boolean;
  currentFolderId: FolderId | null;
  currentFolderPath: string | null;
  entities: Map<string, LibraryEntity>;
  mode: LibraryTreeViewMode;
  onCreateFolder: (name: string, parentId?: FolderId) => Promise<void>;
  onDeleteEntity: (entity: LibraryEntity) => void;
  onDownloadFile: (entity: LibraryEntity) => void;
  onDropEntities?: (
    entities: LibraryEntity[],
    targetFolderId: FolderId | undefined,
  ) => Promise<void>;
  onMoveEntity: (entity: LibraryEntity) => void;
  onOpenEntity: (entity: LibraryEntity) => void;
  onRenameEntity: (entity: LibraryEntity, name: string) => Promise<void>;
  onToggleMode: () => void;
  onUploadFiles: () => void;
  paths: string[];
  title?: string;
  uploadDisabled?: boolean;
}) {
  const view = useMemo(
    () =>
      buildLibraryTreeView({
        entitiesByTreePath: entities,
        mode,
        treePaths: paths,
      }),
    [entities, mode, paths],
  );
  const entityLookup = useMemo(
    () => buildLibraryTreeViewLookup(view.entitiesByViewPath),
    [view.entitiesByViewPath],
  );
  const entitiesRef = useRef(entityLookup);
  const modelRef = useRef<FileTreeModel | null>(null);
  const onCreateFolderRef = useRef(onCreateFolder);
  const onDropEntitiesRef = useRef(onDropEntities);
  const onRenameEntityRef = useRef(onRenameEntity);
  const pathsRef = useRef(view.paths);
  const draftFoldersRef = useRef(
    new Map<string, { parentId: FolderId | undefined }>(),
  );

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
    flattenEmptyDirectories: false,
    icons: { colored: true, set: "complete" },
    initialExpansion: "open",
    paths: view.paths,
    renaming: canManage
      ? {
          onError: (error) => {
            toast.error(error);
          },
          onRename: ({ destinationPath, isFolder, sourcePath }) => {
            const lookupPath = getLibraryTreeViewLookupPath(
              sourcePath,
              isFolder,
            );
            const nextName = getLibraryTreeViewNameFromPath(
              destinationPath,
              mode,
            ).trim();
            const draftFolder = draftFoldersRef.current.get(lookupPath);
            const entity = entitiesRef.current.get(lookupPath);

            if (!nextName) {
              modelRef.current?.resetPaths(pathsRef.current);
              return;
            }

            if (draftFolder) {
              draftFoldersRef.current.delete(lookupPath);
              void onCreateFolderRef
                .current(nextName, draftFolder.parentId)
                .catch((error) => {
                  modelRef.current?.resetPaths(pathsRef.current);
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Folder creation failed",
                  );
                });
              return;
            }

            if (!entity) {
              modelRef.current?.resetPaths(pathsRef.current);
              return;
            }

            void onRenameEntityRef.current(entity, nextName).catch((error) => {
              modelRef.current?.resetPaths(pathsRef.current);
              toast.error(
                error instanceof Error ? error.message : "Rename failed",
              );
            });
          },
        }
      : false,
    search: true,
    searchBlurBehavior: "retain",
    stickyFolders: mode === "tree",
    unsafeCSS: treeUnsafeCSS,
  });
  const search = useFileTreeSearch(model);

  useEffect(() => {
    entitiesRef.current = entityLookup;
    modelRef.current = model;
    onCreateFolderRef.current = onCreateFolder;
    onDropEntitiesRef.current = onDropEntities;
    onRenameEntityRef.current = onRenameEntity;
    pathsRef.current = view.paths;
  }, [
    entityLookup,
    model,
    onCreateFolder,
    onDropEntities,
    onRenameEntity,
    view.paths,
  ]);

  useEffect(() => {
    model.resetPaths(view.paths);
  }, [model, view.paths]);

  const openEntityFromEvent = (event: ReactMouseEvent<HTMLElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

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

    const entity = entityLookup.get(entityPath);
    if (entity?.kind === "file") onOpenEntity(entity);
  };

  const createFolderInline = () => {
    if (!canManage) return;

    const selectedPath = model.getSelectedPaths().at(-1);
    const selectedEntity = selectedPath
      ? entityLookup.get(selectedPath)
      : undefined;
    const parentId =
      selectedEntity?.kind === "folder"
        ? selectedEntity.folder._id
        : selectedEntity?.kind === "file"
          ? selectedEntity.file.folderId
          : (currentFolderId ?? undefined);
    const parentActualPath =
      selectedEntity?.kind === "folder"
        ? selectedEntity.path
        : selectedEntity?.kind === "file"
          ? getParentActualPath(selectedEntity.path)
          : currentFolderPath;
    const draft = buildDraftFolderViewPath({
      existingViewPaths: view.paths,
      mode,
      parentActualPath,
    });

    draftFoldersRef.current.set(draft.viewPath, { parentId });
    model.add(draft.viewPath);

    if (!model.startRenaming(draft.viewPath, { removeIfCanceled: true })) {
      draftFoldersRef.current.delete(draft.viewPath);
      model.resetPaths(pathsRef.current);
    }
  };

  return (
    <FileTree
      aria-label="Library files"
      className="h-full min-h-0 overflow-auto"
      header={
        <LibraryTreeHeader
          canManage={canManage}
          mode={mode}
          onCreateFolder={createFolderInline}
          onToggleMode={onToggleMode}
          onToggleSearch={() => {
            if (search.isOpen) search.close();
            else search.open();
          }}
          onUploadFiles={onUploadFiles}
          searchOpen={search.isOpen}
          title={title}
          uploadDisabled={uploadDisabled}
        />
      }
      model={model}
      onClick={openEntityFromEvent}
      renderContextMenu={(item, context) => {
        const entity = entityLookup.get(item.path);
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
            onRename={() => {
              context.close({ restoreFocus: false });
              model.startRenaming(item.path);
            }}
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
  mode,
  onCreateFolder,
  onToggleMode,
  onToggleSearch,
  onUploadFiles,
  searchOpen,
  title,
  uploadDisabled,
}: {
  canManage: boolean;
  mode: LibraryTreeViewMode;
  onCreateFolder: () => void;
  onToggleMode: () => void;
  onToggleSearch: () => void;
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
          label={mode === "tree" ? "Show flat list" : "Show tree list"}
          onClick={onToggleMode}
          pressed={mode === "flat"}
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
      <MenuItem
        icon={<FolderOpen className="h-3.5 w-3.5" />}
        onClick={() => runAction(onOpen)}
      >
        Open
      </MenuItem>
      {entity.kind === "file" && allowDownloads ? (
        <MenuItem
          icon={<Download className="h-3.5 w-3.5" />}
          onClick={() => runAction(onDownload)}
        >
          Download
        </MenuItem>
      ) : null}
      {canManage ? (
        <>
          <MenuItem
            icon={<Pencil className="h-3.5 w-3.5" />}
            onClick={onRename}
          >
            Rename
          </MenuItem>
          <MenuItem
            icon={<FolderInput className="h-3.5 w-3.5" />}
            onClick={() => runAction(onMove)}
          >
            Move
          </MenuItem>
          <MenuItem
            destructive
            icon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={() => runAction(onDelete)}
          >
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
  icon,
  onClick,
}: {
  children: React.ReactNode;
  destructive?: boolean;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        destructive &&
          "text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive",
      )}
      onClick={onClick}
    >
      <span className="shrink-0">{icon}</span>
      {children}
    </button>
  );
}

function getParentActualPath(path: string) {
  const separatorIndex = path.lastIndexOf("/");
  return separatorIndex === -1 ? null : path.slice(0, separatorIndex);
}
