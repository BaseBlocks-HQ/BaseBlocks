"use client";

import { cn } from "@baseblocks/ui/lib/utils";
import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Image,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
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
      useFsAccessApi: false,
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

const fileTypeIcons: Record<string, LucideIcon> = {
  "application/pdf": FileText,
  "application/msword": FileText,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    FileText,
  "text/plain": FileText,
  "text/markdown": FileText,
  "text/rtf": FileText,
  "application/vnd.ms-excel": FileSpreadsheet,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    FileSpreadsheet,
  "text/csv": FileSpreadsheet,
  "image/jpeg": Image,
  "image/png": Image,
  "image/gif": Image,
  "image/webp": Image,
  "image/svg+xml": Image,
  "video/mp4": FileVideo,
  "video/webm": FileVideo,
  "video/quicktime": FileVideo,
  "audio/mpeg": FileAudio,
  "audio/wav": FileAudio,
  "audio/ogg": FileAudio,
  "application/json": FileCode,
  "application/javascript": FileCode,
  "text/html": FileCode,
  "text/css": FileCode,
  "application/xml": FileCode,
  "application/zip": FileArchive,
  "application/x-rar-compressed": FileArchive,
  "application/x-7z-compressed": FileArchive,
  "application/gzip": FileArchive,
};

export function FileIcon({
  className,
  contentType,
}: {
  className?: string;
  contentType: string;
}) {
  let Icon = fileTypeIcons[contentType];

  if (!Icon) {
    if (contentType.startsWith("image/")) Icon = Image;
    else if (contentType.startsWith("video/")) Icon = FileVideo;
    else if (contentType.startsWith("audio/")) Icon = FileAudio;
    else if (contentType.startsWith("text/")) Icon = FileText;
    else Icon = File;
  }

  return <Icon className={cn("h-4 w-4", className)} />;
}

export function getFileTypeColor(contentType: string): string {
  if (contentType.includes("pdf")) return "text-red-500";
  if (contentType.includes("word") || contentType.includes("document")) {
    return "text-blue-500";
  }
  if (
    contentType.includes("sheet") ||
    contentType.includes("excel") ||
    contentType.includes("csv")
  ) {
    return "text-green-500";
  }
  if (contentType.startsWith("image/")) return "text-purple-500";
  if (contentType.startsWith("video/")) return "text-pink-500";
  if (contentType.startsWith("audio/")) return "text-orange-500";
  if (
    contentType.includes("zip") ||
    contentType.includes("archive") ||
    contentType.includes("rar")
  ) {
    return "text-yellow-600";
  }
  if (
    contentType.includes("json") ||
    contentType.includes("javascript") ||
    contentType.includes("html")
  ) {
    return "text-cyan-500";
  }
  return "text-muted-foreground";
}
