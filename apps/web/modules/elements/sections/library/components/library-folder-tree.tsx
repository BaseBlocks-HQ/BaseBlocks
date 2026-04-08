"use client";

import { cn } from "@/lib/utils";
import { ChevronRight, Folder, FolderOpen } from "lucide-react";
import type { ReactNode } from "react";

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
  renderActions?: (folder: LibraryFolder) => ReactNode;
}

export function LibraryFolderTree({
  folders,
  expandedFolders,
  selectedFolderId,
  onSelectFolder,
  onToggleFolder,
  parentId,
  level = 0,
  renderActions,
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
      renderActions={renderActions}
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
  renderActions,
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
        className={cn(
          "group flex items-center gap-1 rounded-md px-1.5 py-1 text-[13px] leading-5 transition-colors",
          isSelected
            ? "bg-background shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
            : "hover:bg-background/70",
        )}
        style={{ paddingLeft: `${level * 10 + 8}px` }}
      >
        <button
          type="button"
          onClick={() => onToggleFolder(folder._id)}
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground/70",
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
            "flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-0.5 text-left text-foreground/85",
            isSelected && "text-foreground",
          )}
          onClick={() => onSelectFolder(folder._id)}
        >
          {isExpanded ? (
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate flex-1 min-w-0">{folder.name}</span>
        </button>
        {renderActions && isSelected ? (
          <div className="flex shrink-0 items-center">
            {renderActions(folder)}
          </div>
        ) : null}
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
          renderActions={renderActions}
        />
      )}
    </div>
  );
}
