"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Cancel01Icon,
  File01Icon,
  FileAttachmentIcon,
  FileAudioIcon,
  FileScriptIcon,
  FileSpreadsheetIcon,
  FileVideoIcon,
  FileZipIcon,
  Image01Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@baseblocks/ui/lib/utils";
import { useDropzone } from "react-dropzone";

const defaultMaxSize = 50 * 1024 * 1024;

export function formatFileSize(bytes?: number): string {
  if (bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DropZone({
  accept,
  children,
  className,
  disabled = false,
  inputAriaLabel,
  maxSize = defaultMaxSize,
  multiple = true,
  noClick = false,
  onFilesAccepted,
}: {
  accept?: Record<string, string[]>;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  inputAriaLabel?: string;
  maxSize?: number;
  multiple?: boolean;
  noClick?: boolean;
  onFilesAccepted: (files: File[]) => void;
}) {
  const { getInputProps, getRootProps, isDragActive, isDragReject } =
    useDropzone({
      accept,
      disabled,
      maxSize,
      multiple,
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
      <input {...getInputProps({ "aria-label": inputAriaLabel })} />
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
              <HugeiconsIcon
                icon={Cancel01Icon}
                className="h-6 w-6 text-destructive"
              />
            ) : (
              <HugeiconsIcon
                icon={Upload01Icon}
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

const fileTypeIcons: Record<string, IconSvgElement> = {
  "application/pdf": FileAttachmentIcon,
  "application/msword": FileAttachmentIcon,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    FileAttachmentIcon,
  "text/plain": FileAttachmentIcon,
  "text/markdown": FileAttachmentIcon,
  "text/rtf": FileAttachmentIcon,
  "application/vnd.ms-excel": FileSpreadsheetIcon,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    FileSpreadsheetIcon,
  "text/csv": FileSpreadsheetIcon,
  "image/jpeg": Image01Icon,
  "image/png": Image01Icon,
  "image/gif": Image01Icon,
  "image/webp": Image01Icon,
  "image/svg+xml": Image01Icon,
  "video/mp4": FileVideoIcon,
  "video/webm": FileVideoIcon,
  "video/quicktime": FileVideoIcon,
  "audio/mpeg": FileAudioIcon,
  "audio/wav": FileAudioIcon,
  "audio/ogg": FileAudioIcon,
  "application/json": FileScriptIcon,
  "application/javascript": FileScriptIcon,
  "text/html": FileScriptIcon,
  "text/css": FileScriptIcon,
  "application/xml": FileScriptIcon,
  "application/zip": FileZipIcon,
  "application/x-rar-compressed": FileZipIcon,
  "application/x-7z-compressed": FileZipIcon,
  "application/gzip": FileZipIcon,
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
    if (contentType.startsWith("image/")) Icon = Image01Icon;
    else if (contentType.startsWith("video/")) Icon = FileVideoIcon;
    else if (contentType.startsWith("audio/")) Icon = FileAudioIcon;
    else if (contentType.startsWith("text/")) Icon = FileAttachmentIcon;
    else Icon = File01Icon;
  }

  return <HugeiconsIcon className={cn("h-4 w-4", className)} icon={Icon} />;
}
