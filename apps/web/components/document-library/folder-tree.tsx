"use client";

import { ScrollArea } from "@repo/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCallback, useMemo, useState } from "react";
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

export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  className,
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | undefined>();
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);

  // Build folder tree structure
  const folderTree = useMemo(() => {
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
  }, [folders]);

  // Check if folder has children
  const hasChildren = useCallback(
    (folderId: string) => {
      return (folderTree.get(folderId)?.length || 0) > 0;
    },
    [folderTree],
  );

  const handleToggleExpand = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const handleCreateSubfolder = useCallback((parentId: string) => {
    setCreateParentId(parentId);
    setCreateDialogOpen(true);
    // Expand parent folder
    setExpandedFolders((prev) => new Set(prev).add(parentId));
  }, []);

  const handleRename = useCallback((folderId: string) => {
    setRenameFolderId(folderId);
    setRenameDialogOpen(true);
  }, []);

  const handleDelete = useCallback((folderId: string) => {
    setDeleteFolderId(folderId);
    setDeleteDialogOpen(true);
  }, []);

  // Get folder by ID
  const getFolderById = useCallback(
    (id: string) => folders.find((f) => f._id === id),
    [folders],
  );

  // Render folder tree recursively
  const renderFolders = useCallback(
    (parentId?: string, level = 0): React.ReactNode => {
      const children = folderTree.get(parentId) || [];

      return children.map((folder) => (
        <FolderTreeItem
          key={folder._id}
          folder={folder}
          level={level}
          isSelected={selectedFolderId === folder._id}
          isExpanded={expandedFolders.has(folder._id)}
          hasChildren={hasChildren(folder._id)}
          onSelect={(id) => onSelectFolder(id)}
          onToggleExpand={handleToggleExpand}
          onRename={handleRename}
          onDelete={handleDelete}
          onCreateSubfolder={handleCreateSubfolder}
        >
          {expandedFolders.has(folder._id) &&
            renderFolders(folder._id, level + 1)}
        </FolderTreeItem>
      ));
    },
    [
      folderTree,
      selectedFolderId,
      expandedFolders,
      hasChildren,
      onSelectFolder,
      handleToggleExpand,
      handleRename,
      handleDelete,
      handleCreateSubfolder,
    ],
  );

  const renamingFolder = renameFolderId ? getFolderById(renameFolderId) : null;
  const deletingFolder = deleteFolderId ? getFolderById(deleteFolderId) : null;

  return (
    <>
      <ScrollArea className={cn("h-full", className)}>
        <div className="py-2">{renderFolders()}</div>
      </ScrollArea>

      {/* Create folder dialog */}
      <CreateFolderDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setCreateParentId(undefined);
        }}
        onSubmit={async (name) => {
          await onCreateFolder(name, createParentId);
        }}
      />

      {/* Rename dialog */}
      {renamingFolder && (
        <RenameDialog
          type="folder"
          currentName={renamingFolder.name}
          open={renameDialogOpen}
          onOpenChange={(open) => {
            setRenameDialogOpen(open);
            if (!open) setRenameFolderId(null);
          }}
          onSubmit={async (newName) => {
            await onRenameFolder(renameFolderId!, newName);
          }}
        />
      )}

      {/* Delete confirmation dialog */}
      {deletingFolder && (
        <DeleteConfirmDialog
          type="folder"
          name={deletingFolder.name}
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) setDeleteFolderId(null);
          }}
          onConfirm={async () => {
            await onDeleteFolder(deleteFolderId!);
            // If we deleted the selected folder, clear selection
            if (selectedFolderId === deleteFolderId) {
              onSelectFolder(null);
            }
          }}
          hasChildren={hasChildren(deleteFolderId!)}
        />
      )}
    </>
  );
}
