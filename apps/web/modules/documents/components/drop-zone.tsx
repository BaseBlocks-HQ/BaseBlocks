"use client";

import { cn } from "@/lib/utils";
import { Upload, X } from "lucide-react";
import { useDropzone } from "react-dropzone";

interface DropZoneProps {
  onFilesAccepted: (files: File[]) => void;
  disabled?: boolean;
  maxSize?: number; // in bytes
  accept?: Record<string, string[]>;
  className?: string;
  children?: React.ReactNode;
  noClick?: boolean;
}

export function DropZone({
  onFilesAccepted,
  disabled = false,
  maxSize = 50 * 1024 * 1024, // 50MB default
  accept,
  className,
  children,
  noClick = false,
}: DropZoneProps) {
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFilesAccepted(acceptedFiles);
    }
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      disabled,
      maxSize,
      accept,
      multiple: true,
      noClick,
    });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative border-2 border-dashed rounded-lg transition-colors cursor-pointer",
        isDragActive && !isDragReject && "border-primary bg-primary/5",
        isDragReject && "border-destructive bg-destructive/5",
        !isDragActive &&
          !isDragReject &&
          "border-muted-foreground/25 hover:border-muted-foreground/50",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <input {...getInputProps()} />
      {children || (
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <div
            className={cn(
              "rounded-full p-3 mb-3",
              isDragActive && !isDragReject && "bg-primary/10",
              isDragReject && "bg-destructive/10",
              !isDragActive && "bg-muted",
            )}
          >
            {isDragReject ? (
              <X className="h-6 w-6 text-destructive" />
            ) : (
              <Upload
                className={cn(
                  "h-6 w-6",
                  isDragActive ? "text-primary" : "text-muted-foreground",
                )}
              />
            )}
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            {isDragActive
              ? isDragReject
                ? "File type not accepted"
                : "Drop files here"
              : "Drag & drop files here"}
          </p>
          <p className="text-xs text-muted-foreground">or click to browse</p>
        </div>
      )}
    </div>
  );
}

// Compact version for inline use
interface InlineDropZoneProps {
  onFilesAccepted: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
}

export function InlineDropZone({
  onFilesAccepted,
  disabled = false,
  className,
}: InlineDropZoneProps) {
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFilesAccepted(acceptedFiles);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md border border-dashed transition-colors cursor-pointer",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <input {...getInputProps()} />
      <Upload className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        {isDragActive ? "Drop here" : "Upload files"}
      </span>
    </div>
  );
}
