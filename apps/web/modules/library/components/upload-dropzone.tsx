"use client";

import { cn } from "@/lib/utils";
import { Upload, X } from "lucide-react";
import type { ReactNode } from "react";
import { useDropzone } from "react-dropzone";

const maxFileSize = 50 * 1024 * 1024;

export function UploadDropzone({
  children,
  className,
  disabled,
  onFilesAccepted,
}: {
  children: ReactNode;
  className?: string;
  disabled: boolean;
  onFilesAccepted?: (files: File[]) => void;
}) {
  const { getInputProps, getRootProps, isDragActive, isDragReject } =
    useDropzone({
      disabled,
      maxSize: maxFileSize,
      multiple: true,
      noClick: true,
      onDrop: (acceptedFiles) => {
        if (acceptedFiles.length > 0) onFilesAccepted?.(acceptedFiles);
      },
    });

  return (
    <div
      {...getRootProps()}
      className={cn("relative min-h-0 outline-none", className)}
    >
      <input {...getInputProps()} />
      {children}
      {isDragActive ? (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div
            className={cn(
              "flex flex-col items-center gap-3 rounded-lg border bg-background px-6 py-5 shadow-lg",
              isDragReject ? "text-destructive" : "text-primary",
            )}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
              {isDragReject ? (
                <X className="h-5 w-5" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
            </span>
            <p className="text-sm font-medium">
              {isDragReject ? "File is too large" : "Drop files to upload"}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
