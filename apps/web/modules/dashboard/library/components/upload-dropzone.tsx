"use client";

import { cn } from "@/lib/utils";
import { Loader2, Upload, X } from "lucide-react";
import type { ReactNode } from "react";
import { useDropzone } from "react-dropzone";

const maxFileSize = 50 * 1024 * 1024;

export function UploadDropzone({
  children,
  className,
  disabled,
  isUploading = false,
  onFilesAccepted,
  uploadPercent = null,
  uploadingLabel = "Uploading…",
}: {
  children: ReactNode;
  className?: string;
  disabled: boolean;
  /** After drop or picker: show the same bottom pill with a loading treatment. */
  isUploading?: boolean;
  onFilesAccepted?: (files: File[]) => void;
  /** Aggregate 0–100 from storage client; null while busy but before byte events. */
  uploadPercent?: number | null;
  uploadingLabel?: string;
}) {
  const { getInputProps, getRootProps, isDragActive, isDragReject } =
    useDropzone({
      disabled,
      maxSize: maxFileSize,
      multiple: true,
      noClick: true,
      useFsAccessApi: false,
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
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-40 rounded-[inherit] ring-2 ring-inset ring-primary/35 transition-[box-shadow] duration-150",
            isDragReject && "ring-destructive/50",
          )}
        >
          <div className="absolute inset-x-0 bottom-3 flex justify-center px-3">
            <div
              className={cn(
                "flex max-w-full items-center gap-2 rounded-full border bg-popover/95 px-3.5 py-1.5 text-xs font-medium text-popover-foreground shadow-md backdrop-blur-sm",
                isDragReject
                  ? "border-destructive/25 text-destructive"
                  : "border-border/80",
              )}
            >
              {isDragReject ? (
                <X className="h-3.5 w-3.5 shrink-0 opacity-90" />
              ) : (
                <Upload className="h-3.5 w-3.5 shrink-0 text-primary opacity-90" />
              )}
              <span className="truncate">
                {isDragReject ? "File is too large" : "Drop to upload"}
              </span>
            </div>
          </div>
        </div>
      ) : isUploading ? (
        <div
          className="pointer-events-none absolute inset-0 z-40 rounded-[inherit] bg-primary/[0.04] ring-1 ring-inset ring-primary/15 animate-in fade-in-0 duration-200"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="absolute inset-x-0 bottom-3 flex justify-center px-3">
            <div className="flex min-w-[11.5rem] max-w-[min(100%,20rem)] flex-col gap-2 rounded-2xl border border-border/80 bg-popover/95 px-3.5 py-2.5 text-xs text-popover-foreground shadow-md backdrop-blur-sm">
              <div className="flex items-center gap-2.5 font-medium tabular-nums">
                <Loader2
                  className="h-3.5 w-3.5 shrink-0 animate-spin text-primary"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">
                  {uploadingLabel}
                </span>
                {uploadPercent != null ? (
                  <span className="shrink-0 text-muted-foreground">
                    {uploadPercent}%
                  </span>
                ) : null}
              </div>
              <div className="relative h-1 overflow-hidden rounded-full bg-muted/80">
                {uploadPercent != null ? (
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
                    style={{
                      width: `${Math.min(100, Math.max(0, uploadPercent))}%`,
                    }}
                  />
                ) : (
                  <div className="absolute inset-y-0 left-0 w-[38%] rounded-full bg-primary/55 [animation:library-upload-shimmer_1.15s_ease-in-out_infinite] motion-reduce:[animation:none] motion-reduce:opacity-70" />
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
