"use client";

import { cn } from "@/lib/utils";
import {
  DocumentFileRow,
  type FileData,
  type FolderData,
} from "@/modules/documents";
import { File, Folder } from "lucide-react";
import type { ReactNode } from "react";
import { LibraryContentRow } from "./library-content-row";

interface LibraryContentListProps {
  subfolders: FolderData[];
  files: FileData[];
  onSelectFolder: (folderId: string) => void;
  onOpenFile: (file: FileData) => void;
  renderFolderActions?: (folder: FolderData) => ReactNode;
  renderFileActions?: (file: FileData) => ReactNode;
  className?: string;
  emptyState?: ReactNode;
}

export function LibraryContentList({
  subfolders,
  files,
  onSelectFolder,
  onOpenFile,
  renderFolderActions,
  renderFileActions,
  className,
  emptyState,
}: LibraryContentListProps) {
  if (subfolders.length === 0 && files.length === 0) {
    return (
      emptyState ?? (
        <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
          <File className="mb-3 h-8 w-8 opacity-35" strokeWidth={1.75} />
          <p className="text-sm font-medium">No files yet</p>
          <p className="mt-0.5 text-xs opacity-70">This folder is empty</p>
        </div>
      )
    );
  }

  return (
    <div className={cn("flex-1 overflow-auto", className)}>
      <div className="space-y-1 p-2">
        {subfolders.map((folder) => (
          <LibraryContentRow
            key={folder._id}
            icon={<Folder className="h-4 w-4" />}
            title={<span className="block truncate">{folder.name}</span>}
            meta="Folder"
            onClick={() => onSelectFolder(folder._id)}
            actions={renderFolderActions?.(folder)}
            showChevron={!renderFolderActions}
          />
        ))}

        {files.map((file) => (
          <DocumentFileRow
            key={file._id}
            file={file}
            onOpen={onOpenFile}
            actions={renderFileActions?.(file)}
          />
        ))}
      </div>
    </div>
  );
}
