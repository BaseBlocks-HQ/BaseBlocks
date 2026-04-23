"use client";

import { cn } from "@/lib/utils";
import { Upload, X } from "lucide-react";
import { useDropzone } from "react-dropzone";

const defaultMaxSize = 50 * 1024 * 1024;

export function DropZone({
  accept,
  children,
  className,
  disabled = false,
  maxSize = defaultMaxSize,
  noClick = false,
  onFilesAccepted,
}: {
  accept?: Record<string, string[]>;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  maxSize?: number;
  noClick?: boolean;
  onFilesAccepted: (files: File[]) => void;
}) {
  const { getInputProps, getRootProps, isDragActive, isDragReject } =
    useDropzone({
      accept,
      disabled,
      maxSize,
      multiple: true,
      noClick,
      onDrop: (acceptedFiles) => {
        if (acceptedFiles.length > 0) {
          onFilesAccepted(acceptedFiles);
        }
      },
    });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative cursor-pointer rounded-lg border-2 border-dashed transition-colors",
        isDragActive && !isDragReject && "border-primary bg-primary/5",
        isDragReject && "border-destructive bg-destructive/5",
        !isDragActive &&
          !isDragReject &&
          "border-muted-foreground/25 hover:border-muted-foreground/50",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input {...getInputProps()} />
      {children || (
        <div className="flex flex-col items-center justify-center px-4 py-8">
          <div
            className={cn(
              "mb-3 rounded-full p-3",
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
          <p className="mb-1 text-sm font-medium text-foreground">
            {isDragActive
              ? isDragReject
                ? "File type not accepted"
                : "Drop files here"
              : "Drag and drop files here"}
          </p>
          <p className="text-xs text-muted-foreground">or click to browse</p>
        </div>
      )}
    </div>
  );
}
