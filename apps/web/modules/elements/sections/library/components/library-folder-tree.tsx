"use client";

import { cn } from "@/lib/utils";
import { ChevronRight, Folder, FolderOpen } from "lucide-react";

interface LibraryFolder {
  _id: string;
  name: string;
  parentId?: string;
  order: number;
}

interface LibraryFolderTreeProps {
  folders: LibraryFolder[];
  expandedFolders: Set<string>;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string) => void;
  onToggleFolder: (folderId: string) => void;
  parentId?: string;
  level?: number;
}

export function LibraryFolderTree({
  folders,
  expandedFolders,
  selectedFolderId,
  onSelectFolder,
  onToggleFolder,
  parentId,
  level = 0,
}: LibraryFolderTreeProps) {
  const children = folders
    .filter((folder) => folder.parentId === parentId)
    .sort((a, b) => a.order - b.order);

  return children.map((folder) => (
    <FolderBranch
      key={folder._id}
      folder={folder}
      folders={folders}
      expandedFolders={expandedFolders}
      selectedFolderId={selectedFolderId}
      onSelectFolder={onSelectFolder}
      onToggleFolder={onToggleFolder}
      level={level}
    />
  ));
}

function FolderBranch({
  folder,
  folders,
  expandedFolders,
  selectedFolderId,
  onSelectFolder,
  onToggleFolder,
  level,
}: Omit<LibraryFolderTreeProps, "parentId"> & {
  folder: LibraryFolder;
  level: number;
}) {
  const isExpanded = expandedFolders.has(folder._id);
  const isSelected = selectedFolderId === folder._id;
  const hasSubfolders = folders.some((item) => item.parentId === folder._id);

  return (
    <div>
      <div
        className="flex items-center gap-1 py-1 px-2 rounded text-sm"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        <button
          type="button"
          onClick={() => onToggleFolder(folder._id)}
          className={cn(
            "shrink-0 h-4 w-4 flex items-center justify-center",
            !hasSubfolders && "invisible",
          )}
          aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
        >
          <ChevronRight
            className={cn(
              "h-3 w-3 transition-transform",
              isExpanded && "rotate-90",
            )}
          />
        </button>
        <button
          type="button"
          className={cn(
            "flex flex-1 min-w-0 items-center gap-1 rounded px-1 py-0.5 text-left",
            isSelected
              ? "bg-primary/10 text-primary font-medium"
              : "hover:bg-muted/50",
          )}
          onClick={() => onSelectFolder(folder._id)}
        >
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="truncate flex-1 min-w-0">{folder.name}</span>
        </button>
      </div>
      {isExpanded && (
        <LibraryFolderTree
          folders={folders}
          expandedFolders={expandedFolders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={onSelectFolder}
          onToggleFolder={onToggleFolder}
          parentId={folder._id}
          level={level + 1}
        />
      )}
    </div>
  );
}
