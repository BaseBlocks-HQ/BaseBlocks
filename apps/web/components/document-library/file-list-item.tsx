"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Download,
  Eye,
  FolderInput,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { FileIcon, getFileTypeColor } from "./file-icon";

export interface FileData {
  _id: string;
  filename: string;
  contentType: string;
  size: number;
  cdnUrl: string;
  createdAt: number;
}

interface FileListItemProps {
  file: FileData;
  onDownload: (file: FileData) => void;
  onPreview?: (file: FileData) => void;
  onRename: (file: FileData) => void;
  onDelete: (file: FileData) => void;
  onMove?: (file: FileData) => void;
  isReadOnly?: boolean;
  className?: string;
}

export function FileListItem({
  file,
  onDownload,
  onPreview,
  onRename,
  onDelete,
  onMove,
  isReadOnly = false,
  className,
}: FileListItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleClick = () => {
    if (onPreview) {
      onPreview(file);
    }
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors",
        onPreview && "cursor-pointer",
        className,
      )}
      onClick={handleClick}
    >
      {/* File icon */}
      <div className={cn("flex-shrink-0", getFileTypeColor(file.contentType))}>
        <FileIcon contentType={file.contentType} className="h-5 w-5" />
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.filename}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(file.size)} • {formatDate(file.createdAt)}
        </p>
      </div>

      {/* Actions */}
      {isReadOnly ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          {onPreview && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onPreview(file);
              }}
              title="Preview"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onDownload(file);
            }}
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100",
                showMenu && "opacity-100",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onPreview && (
              <>
                <DropdownMenuItem onClick={() => onPreview(file)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => onDownload(file)}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onRename(file)}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            {onMove && (
              <DropdownMenuItem onClick={() => onMove(file)}>
                <FolderInput className="h-4 w-4 mr-2" />
                Move to folder
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(file)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
