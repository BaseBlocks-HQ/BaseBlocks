"use client";

import { cn } from "@/lib/utils";
import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Image,
  type LucideIcon,
} from "lucide-react";

const FILE_TYPE_ICONS: Record<string, LucideIcon> = {
  // Documents
  "application/pdf": FileText,
  "application/msword": FileText,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    FileText,
  "text/plain": FileText,
  "text/markdown": FileText,
  "text/rtf": FileText,

  // Spreadsheets
  "application/vnd.ms-excel": FileSpreadsheet,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    FileSpreadsheet,
  "text/csv": FileSpreadsheet,

  // Images
  "image/jpeg": Image,
  "image/png": Image,
  "image/gif": Image,
  "image/webp": Image,
  "image/svg+xml": Image,

  // Video
  "video/mp4": FileVideo,
  "video/webm": FileVideo,
  "video/quicktime": FileVideo,

  // Audio
  "audio/mpeg": FileAudio,
  "audio/wav": FileAudio,
  "audio/ogg": FileAudio,

  // Code
  "application/json": FileCode,
  "application/javascript": FileCode,
  "text/html": FileCode,
  "text/css": FileCode,
  "application/xml": FileCode,

  // Archives
  "application/zip": FileArchive,
  "application/x-rar-compressed": FileArchive,
  "application/x-7z-compressed": FileArchive,
  "application/gzip": FileArchive,
};

interface FileIconProps {
  contentType: string;
  className?: string;
}

export function FileIcon({ contentType, className }: FileIconProps) {
  // Check for exact match first
  let IconComponent = FILE_TYPE_ICONS[contentType];

  // If no exact match, check by type category
  if (!IconComponent) {
    if (contentType.startsWith("image/")) {
      IconComponent = Image;
    } else if (contentType.startsWith("video/")) {
      IconComponent = FileVideo;
    } else if (contentType.startsWith("audio/")) {
      IconComponent = FileAudio;
    } else if (contentType.startsWith("text/")) {
      IconComponent = FileText;
    } else {
      IconComponent = File;
    }
  }

  return <IconComponent className={cn("h-4 w-4", className)} />;
}

// Helper to get a color class based on file type
export function getFileTypeColor(contentType: string): string {
  if (contentType.includes("pdf")) return "text-red-500";
  if (contentType.includes("word") || contentType.includes("document"))
    return "text-blue-500";
  if (
    contentType.includes("sheet") ||
    contentType.includes("excel") ||
    contentType.includes("csv")
  )
    return "text-green-500";
  if (contentType.startsWith("image/")) return "text-purple-500";
  if (contentType.startsWith("video/")) return "text-pink-500";
  if (contentType.startsWith("audio/")) return "text-orange-500";
  if (
    contentType.includes("zip") ||
    contentType.includes("archive") ||
    contentType.includes("rar")
  )
    return "text-yellow-600";
  if (
    contentType.includes("json") ||
    contentType.includes("javascript") ||
    contentType.includes("html")
  )
    return "text-cyan-500";
  return "text-muted-foreground";
}
