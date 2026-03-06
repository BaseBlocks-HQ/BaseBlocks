"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { useReducer } from "react";
import { CreateFolderDialog } from "./create-folder-dialog";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { type FolderData, FolderTreeItem } from "./folder-tree-item";
import { RenameDialog } from "./rename-dialog";

interface FolderTreeProps {
  folders: FolderData[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentId?: string) => Promise<void>;
  onRenameFolder: (folderId: string, name: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  className?: string;
}

interface FolderTreeState {
  createDialogOpen: boolean;
  createParentId?: string;
  deleteDialogOpen: boolean;
  deleteFolderId: string | null;
  expandedFolders: Set<string>;
  renameDialogOpen: boolean;
  renameFolderId: string | null;
}

type FolderTreeAction =
  | { type: "closeCreate" }
  | { type: "closeDelete" }
  | { type: "closeRename" }
  | { type: "openCreate"; parentId?: string }
  | { type: "openDelete"; folderId: string }
  | { type: "openRename"; folderId: string }
  | { type: "toggleExpand"; folderId: string };

function folderTreeReducer(
  state: FolderTreeState,
  action: FolderTreeAction,
): FolderTreeState {
  switch (action.type) {
    case "toggleExpand": {
      const expandedFolders = new Set(state.expandedFolders);
      if (expandedFolders.has(action.folderId)) {
        expandedFolders.delete(action.folderId);
      } else {
        expandedFolders.add(action.folderId);
      }
      return { ...state, expandedFolders };
    }
    case "openCreate":
      return {
        ...state,
        createDialogOpen: true,
        createParentId: action.parentId,
        expandedFolders: action.parentId
          ? new Set(state.expandedFolders).add(action.parentId)
          : state.expandedFolders,
      };
    case "closeCreate":
      return { ...state, createDialogOpen: false, createParentId: undefined };
    case "openRename":
      return {
        ...state,
        renameDialogOpen: true,
        renameFolderId: action.folderId,
      };
    case "closeRename":
      return { ...state, renameDialogOpen: false, renameFolderId: null };
    case "openDelete":
      return {
        ...state,
        deleteDialogOpen: true,
        deleteFolderId: action.folderId,
      };
    case "closeDelete":
      return { ...state, deleteDialogOpen: false, deleteFolderId: null };
    default:
      return state;
  }
}

function FolderTreeBranch({
  expandedFolders,
  folderTree,
  getHasChildren,
  level = 0,
  onCreateSubfolder,
  onDelete,
  onRename,
  onSelectFolder,
  onToggleExpand,
  parentId,
  selectedFolderId,
}: {
  expandedFolders: Set<string>;
  folderTree: Map<string | undefined, FolderData[]>;
  getHasChildren: (folderId: string) => boolean;
  level?: number;
  onCreateSubfolder: (parentId: string) => void;
  onDelete: (folderId: string) => void;
  onRename: (folderId: string) => void;
  onSelectFolder: (folderId: string | null) => void;
  onToggleExpand: (folderId: string) => void;
  parentId?: string;
  selectedFolderId: string | null;
}) {
  const children = folderTree.get(parentId) || [];

  return children.map((folder) => (
    <FolderTreeItem
      key={folder._id}
      folder={folder}
      level={level}
      isSelected={selectedFolderId === folder._id}
      isExpanded={expandedFolders.has(folder._id)}
      hasChildren={getHasChildren(folder._id)}
      onSelect={onSelectFolder}
      onToggleExpand={onToggleExpand}
      onRename={onRename}
      onDelete={onDelete}
      onCreateSubfolder={onCreateSubfolder}
    >
      {expandedFolders.has(folder._id) && (
        <FolderTreeBranch
          expandedFolders={expandedFolders}
          folderTree={folderTree}
          getHasChildren={getHasChildren}
          level={level + 1}
          onCreateSubfolder={onCreateSubfolder}
          onDelete={onDelete}
          onRename={onRename}
          onSelectFolder={onSelectFolder}
          onToggleExpand={onToggleExpand}
          parentId={folder._id}
          selectedFolderId={selectedFolderId}
        />
      )}
    </FolderTreeItem>
  ));
}

export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  className,
}: FolderTreeProps) {
  const [state, dispatch] = useReducer(folderTreeReducer, {
    createDialogOpen: false,
    createParentId: undefined,
    deleteDialogOpen: false,
    deleteFolderId: null,
    expandedFolders: new Set<string>(),
    renameDialogOpen: false,
    renameFolderId: null,
  });

  // Build folder tree structure
  const folderTree = (() => {
    const childrenMap = new Map<string | undefined, FolderData[]>();

    for (const folder of folders) {
      const parentKey = folder.parentId || undefined;
      const children = childrenMap.get(parentKey) || [];
      children.push(folder);
      childrenMap.set(parentKey, children);
    }

    // Sort children by order
    for (const children of childrenMap.values()) {
      children.sort((a, b) => a.order - b.order);
    }

    return childrenMap;
  })();

  // Check if folder has children
  const hasChildren = (folderId: string) => {
    return (folderTree.get(folderId)?.length || 0) > 0;
  };

  const handleCreateSubfolder = (parentId: string) => {
    dispatch({ type: "openCreate", parentId });
  };

  const handleRename = (folderId: string) => {
    dispatch({ type: "openRename", folderId });
  };

  const handleDelete = (folderId: string) => {
    dispatch({ type: "openDelete", folderId });
  };

  // Get folder by ID
  const getFolderById = (id: string) => folders.find((f) => f._id === id);

  const renamingFolder = state.renameFolderId
    ? getFolderById(state.renameFolderId)
    : null;
  const deletingFolder = state.deleteFolderId
    ? getFolderById(state.deleteFolderId)
    : null;

  return (
    <>
      <ScrollArea className={cn("h-full", className)}>
        <div className="py-2">
          <FolderTreeBranch
            expandedFolders={state.expandedFolders}
            folderTree={folderTree}
            getHasChildren={hasChildren}
            onCreateSubfolder={handleCreateSubfolder}
            onDelete={handleDelete}
            onRename={handleRename}
            onSelectFolder={onSelectFolder}
            onToggleExpand={(folderId) =>
              dispatch({ type: "toggleExpand", folderId })
            }
            selectedFolderId={selectedFolderId}
          />
        </div>
      </ScrollArea>

      {/* Create folder dialog */}
      <CreateFolderDialog
        open={state.createDialogOpen}
        onOpenChange={(open) => {
          if (!open) dispatch({ type: "closeCreate" });
        }}
        onSubmit={async (name) => {
          await onCreateFolder(name, state.createParentId);
        }}
      />

      {/* Rename dialog */}
      {renamingFolder && (
        <RenameDialog
          type="folder"
          currentName={renamingFolder.name}
          open={state.renameDialogOpen}
          onOpenChange={(open) => {
            if (!open) dispatch({ type: "closeRename" });
          }}
          onSubmit={async (newName) => {
            await onRenameFolder(state.renameFolderId!, newName);
          }}
        />
      )}

      {/* Delete confirmation dialog */}
      {deletingFolder && (
        <DeleteConfirmDialog
          type="folder"
          name={deletingFolder.name}
          open={state.deleteDialogOpen}
          onOpenChange={(open) => {
            if (!open) dispatch({ type: "closeDelete" });
          }}
          onConfirm={async () => {
            await onDeleteFolder(state.deleteFolderId!);
            // If we deleted the selected folder, clear selection
            if (selectedFolderId === state.deleteFolderId) {
              onSelectFolder(null);
            }
          }}
          hasChildren={hasChildren(state.deleteFolderId!)}
        />
      )}
    </>
  );
}
