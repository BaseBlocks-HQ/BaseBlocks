"use client";

import { cn } from "@/lib/utils";
import { FileIcon, getFileTypeColor } from "@/modules/documents";
import { Button } from "@baseblocks/ui/button";
import { MiddleTruncate } from "@baseblocks/ui/middle-truncate";
import { ChevronRight, Download, Eye, Folder } from "lucide-react";

interface LibraryFolder {
  _id: string;
  name: string;
}

interface LibraryFile {
  _id: string;
  filename: string;
  contentType: string;
  size: number;
}

interface LibraryFileListProps {
  subfolders: LibraryFolder[];
  files: LibraryFile[];
  allowDownloads: boolean;
  onSelectFolder: (folderId: string) => void;
  onPreviewFile: (file: LibraryFile) => void;
  onDownloadFile: (file: LibraryFile) => void;
}

export function LibraryFileList({
  subfolders,
  files,
  allowDownloads,
  onSelectFolder,
  onPreviewFile,
  onDownloadFile,
}: LibraryFileListProps) {
  return (
    <div className="p-1.5 space-y-0.5">
      {files.length === 0 &&
        subfolders.map((folder) => (
          <button
            key={folder._id}
            type="button"
            className="flex w-full items-center gap-2 py-1.5 px-2 rounded hover:bg-primary/5 group text-left"
            onClick={() => onSelectFolder(folder._id)}
          >
            <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-sm truncate flex-1 min-w-0">
              {folder.name}
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
          </button>
        ))}

      {files.map((file) => (
        <button
          key={file._id}
          type="button"
          className="flex w-full items-center gap-2 py-1.5 px-2 rounded hover:bg-primary/5 group text-left"
          onClick={() => onPreviewFile(file)}
        >
          <div className={cn("shrink-0", getFileTypeColor(file.contentType))}>
            <FileIcon contentType={file.contentType} className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <MiddleTruncate
              text={file.filename}
              className="text-sm"
              endChars={10}
            />
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(event) => {
                event.stopPropagation();
                onPreviewFile(file);
              }}
              title="Preview"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            {allowDownloads && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(event) => {
                  event.stopPropagation();
                  onDownloadFile(file);
                }}
                title="Download"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${Number.parseFloat((bytes / 1024 ** index).toFixed(1))} ${units[index]}`;
}
