"use client";

import { cn } from "@/lib/utils";
import {
  type FileData,
  FileIcon,
  type FolderData,
  getFileTypeColor,
} from "@/modules/documents";
import { MiddleTruncate } from "@baseblocks/ui/middle-truncate";
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
          <LibraryContentRow
            key={file._id}
            icon={
              <div
                className={cn("shrink-0", getFileTypeColor(file.contentType))}
              >
                <FileIcon contentType={file.contentType} className="h-4 w-4" />
              </div>
            }
            title={
              <MiddleTruncate
                text={file.filename}
                className="min-w-0"
                endChars={12}
              />
            }
            meta={formatFileMeta(file)}
            onClick={() => onOpenFile(file)}
            actions={renderFileActions?.(file)}
          />
        ))}
      </div>
    </div>
  );
}

function formatFileMeta(file: Pick<FileData, "size" | "createdAt">) {
  const parts = [formatFileSize(file.size)];

  if (file.createdAt) {
    parts.push(
      new Date(file.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    );
  }

  return parts.join(" • ");
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${Number.parseFloat((bytes / 1024 ** index).toFixed(1))} ${units[index]}`;
}
