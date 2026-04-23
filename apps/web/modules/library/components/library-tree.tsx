"use client";

import { cn } from "@/lib/utils";
import type { LibraryEntity } from "@/modules/library/types";
import type {
  ContextMenuOpenContext,
  FileTreeCompositionOptions,
} from "@pierre/trees";
import { FileTree, useFileTree } from "@pierre/trees/react";
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
    width: 100%;
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
  "--trees-bg-override": "transparent",
  "--trees-search-bg-override": "light-dark(#fff, oklch(14.5% 0 0))",
} as const;

export function LibraryTree({
  allowDownloads,
  canManage,
  entities,
  onCreateFolder,
  onDeleteEntity,
  onDownloadFile,
  onMoveEntity,
  onOpenEntity,
  onRenameEntity,
  onUploadFiles,
  paths,
  uploadDisabled,
}: {
  allowDownloads: boolean;
  canManage: boolean;
  entities: Map<string, LibraryEntity>;
  onCreateFolder: () => void;
  onDeleteEntity: (entity: LibraryEntity) => void;
  onDownloadFile: (entity: LibraryEntity) => void;
  onMoveEntity: (entity: LibraryEntity) => void;
  onOpenEntity: (entity: LibraryEntity) => void;
  onRenameEntity: (entity: LibraryEntity) => void;
  onUploadFiles: () => void;
  paths: string[];
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
      onMoveEntity={onMoveEntity}
      onOpenEntity={onOpenEntity}
      onRenameEntity={onRenameEntity}
      onToggleFlatten={() => setFlattenEmptyDirectories((value) => !value)}
      onUploadFiles={onUploadFiles}
      paths={paths}
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
  onMoveEntity,
  onOpenEntity,
  onRenameEntity,
  onToggleFlatten,
  onUploadFiles,
  paths,
  uploadDisabled,
}: {
  allowDownloads: boolean;
  canManage: boolean;
  entities: Map<string, LibraryEntity>;
  flattenEmptyDirectories: boolean;
  onCreateFolder: () => void;
  onDeleteEntity: (entity: LibraryEntity) => void;
  onDownloadFile: (entity: LibraryEntity) => void;
  onMoveEntity: (entity: LibraryEntity) => void;
  onOpenEntity: (entity: LibraryEntity) => void;
  onRenameEntity: (entity: LibraryEntity) => void;
  onToggleFlatten: () => void;
  onUploadFiles: () => void;
  paths: string[];
  uploadDisabled?: boolean;
}) {
  const initialPaths = useRef(paths).current;
  const entitiesRef = useRef(entities);
  const onOpenEntityRef = useRef(onOpenEntity);

  entitiesRef.current = entities;
  onOpenEntityRef.current = onOpenEntity;

  const { model } = useFileTree({
    composition: treeComposition,
    density: "compact",
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
          onOpenSearch={() => model.openSearch()}
          onToggleFlatten={onToggleFlatten}
          onUploadFiles={onUploadFiles}
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

function LibraryTreeHeader({
  canManage,
  flattenEmptyDirectories,
  onCreateFolder,
  onOpenSearch,
  onToggleFlatten,
  onUploadFiles,
  uploadDisabled,
}: {
  canManage: boolean;
  flattenEmptyDirectories: boolean;
  onCreateFolder: () => void;
  onOpenSearch: () => void;
  onToggleFlatten: () => void;
  onUploadFiles: () => void;
  uploadDisabled?: boolean;
}) {
  return (
    <div className="group/tree-header flex h-10 items-center justify-end gap-1.5 border-b bg-background/95 px-2">
      <TreeHeaderButton label="Search files" onClick={onOpenSearch}>
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
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40",
        pressed && "bg-muted text-foreground",
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
