"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { EmptyState } from "./empty-state";
import { type FileData, FileListItem } from "./file-list-item";
import { RenameDialog } from "./rename-dialog";

interface FileListProps {
  files: FileData[];
  onDownload: (file: FileData) => void;
  onPreview?: (file: FileData) => void;
  onRename: (fileId: string, newName: string) => Promise<void>;
  onDelete: (fileId: string) => Promise<void>;
  onMove?: (fileId: string, folderId: string | null) => Promise<void>;
  onRetryExtraction?: (file: FileData) => Promise<void>;
  isReadOnly?: boolean;
  className?: string;
}

export function FileList({
  files,
  onDownload,
  onPreview,
  onRename,
  onDelete,
  onRetryExtraction,
  isReadOnly = false,
  className,
}: FileListProps) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameFile, setRenameFile] = useState<FileData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteFile, setDeleteFile] = useState<FileData | null>(null);

  const handleRename = (file: FileData) => {
    setRenameFile(file);
    setRenameDialogOpen(true);
  };

  const handleDelete = (file: FileData) => {
    setDeleteFile(file);
    setDeleteDialogOpen(true);
  };

  const handleDownload = (file: FileData) => {
    // Open download URL in new tab (via proxy to bypass corporate firewall)
    window.open(file.downloadUrl, "_blank");
    onDownload(file);
  };

  if (files.length === 0) {
    return <EmptyState type="files" className={className} />;
  }

  // Sort files by name
  const sortedFiles = [...files].sort((a, b) =>
    a.filename.localeCompare(b.filename),
  );

  return (
    <>
      <div
        className={cn(
          "h-full w-full overflow-y-auto overflow-x-hidden",
          className,
        )}
      >
        <div className="space-y-1 py-2 w-full min-w-0">
          {sortedFiles.map((file) => (
            <FileListItem
              key={file._id}
              file={file}
              onDownload={handleDownload}
              onPreview={onPreview}
              onRename={handleRename}
              onDelete={handleDelete}
              onRetryExtraction={onRetryExtraction}
              isReadOnly={isReadOnly}
            />
          ))}
        </div>
      </div>

      {/* Rename dialog */}
      {renameFile && (
        <RenameDialog
          type="file"
          currentName={renameFile.filename}
          open={renameDialogOpen}
          onOpenChange={(open) => {
            setRenameDialogOpen(open);
            if (!open) setRenameFile(null);
          }}
          onSubmit={async (newName) => {
            await onRename(renameFile._id, newName);
          }}
        />
      )}

      {/* Delete confirmation dialog */}
      {deleteFile && (
        <DeleteConfirmDialog
          type="file"
          name={deleteFile.filename}
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) setDeleteFile(null);
          }}
          onConfirm={async () => {
            await onDelete(deleteFile._id);
          }}
        />
      )}
    </>
  );
}
