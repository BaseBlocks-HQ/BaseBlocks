"use client";

import { cn } from "@/lib/utils";
import { type FileData, FileIcon, getFileTypeColor } from "@/modules/documents";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { MiddleTruncate } from "@baseblocks/ui/middle-truncate";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

interface FileItemProps {
  file: FileData;
  onPreview: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function FileItem({
  file,
  onPreview,
  onRename,
  onDelete,
}: FileItemProps) {
  return (
    <div
      className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
      onClick={onPreview}
    >
      <div className={cn("shrink-0", getFileTypeColor(file.contentType))}>
        <FileIcon contentType={file.contentType} className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <MiddleTruncate text={file.filename} className="text-sm" endChars={8} />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="p-1 opacity-0 group-hover:opacity-100 shrink-0"
          >
            <MoreHorizontal className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onPreview}>
            <Eye className="h-3 w-3 mr-2" /> Preview
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRename}>
            <Pencil className="h-3 w-3 mr-2" /> Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-3 w-3 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
