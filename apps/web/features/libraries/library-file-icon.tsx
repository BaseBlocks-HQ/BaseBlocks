import { HugeiconsIcon } from "@hugeicons/react";
import {
  Csv01Icon,
  File01Icon,
  FileArchiveIcon,
  FileAudioIcon,
  FileCodeIcon,
  FileImageIcon,
  FileVideoIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@baseblocks/ui/lib/utils";
import Image from "next/image";

export type LibraryFileIconKind =
  | "archive"
  | "audio"
  | "code"
  | "csv"
  | "document"
  | "file"
  | "image"
  | "markdown"
  | "pdf"
  | "presentation"
  | "spreadsheet"
  | "text"
  | "video";

const extensionPattern = /\.([^.]+)$/;

export function getLibraryFileIconKind(
  filename: string,
  contentType: string,
): LibraryFileIconKind {
  const normalizedType = contentType.toLowerCase().split(";", 1)[0] ?? "";
  const extension = filename.toLowerCase().match(extensionPattern)?.[1] ?? "";

  if (normalizedType === "application/pdf" || extension === "pdf") return "pdf";
  if (
    normalizedType.includes("presentation") ||
    normalizedType === "application/vnd.ms-powerpoint" ||
    ["ppt", "pptx"].includes(extension)
  ) {
    return "presentation";
  }
  if (
    normalizedType.includes("spreadsheet") ||
    normalizedType === "application/vnd.ms-excel" ||
    ["xls", "xlsx"].includes(extension)
  ) {
    return "spreadsheet";
  }
  if (
    normalizedType.includes("wordprocessingml") ||
    normalizedType === "application/msword" ||
    ["doc", "docx"].includes(extension)
  ) {
    return "document";
  }
  if (
    normalizedType === "text/markdown" ||
    ["md", "mdx", "markdown"].includes(extension)
  ) {
    return "markdown";
  }
  if (normalizedType === "text/csv" || extension === "csv") return "csv";
  if (normalizedType.startsWith("image/")) return "image";
  if (normalizedType.startsWith("video/")) return "video";
  if (normalizedType.startsWith("audio/")) return "audio";
  if (
    [
      "application/zip",
      "application/x-7z-compressed",
      "application/x-rar-compressed",
      "application/gzip",
    ].includes(normalizedType) ||
    ["zip", "7z", "rar", "gz", "tar"].includes(extension)
  ) {
    return "archive";
  }
  if (
    ["application/json", "application/javascript", "application/xml"].includes(
      normalizedType,
    ) ||
    [
      "css",
      "html",
      "js",
      "jsx",
      "json",
      "sql",
      "ts",
      "tsx",
      "xml",
      "yaml",
      "yml",
    ].includes(extension)
  ) {
    return "code";
  }
  if (normalizedType.startsWith("text/") || extension === "txt") return "text";
  return "file";
}

const documentIconSource: Partial<Record<LibraryFileIconKind, string>> = {
  document: "/document-icons/word.svg",
  markdown: "/document-icons/markdown.svg",
  pdf: "/document-icons/pdf.svg",
  presentation: "/document-icons/powerpoint.svg",
  spreadsheet: "/document-icons/excel.svg",
  text: "/document-icons/text.svg",
};

const fallbackIcon = {
  archive: FileArchiveIcon,
  audio: FileAudioIcon,
  code: FileCodeIcon,
  csv: Csv01Icon,
  file: File01Icon,
  image: FileImageIcon,
  video: FileVideoIcon,
} as const;

export function LibraryFileIcon({
  className,
  contentType,
  filename,
}: {
  className?: string;
  contentType: string;
  filename: string;
}) {
  const kind = getLibraryFileIconKind(filename, contentType);
  const source = documentIconSource[kind];

  if (source) {
    return (
      <Image
        alt=""
        aria-hidden="true"
        className={cn("size-3.5 shrink-0 object-contain", className)}
        draggable={false}
        height={14}
        src={source}
        width={14}
      />
    );
  }

  return (
    <HugeiconsIcon
      aria-hidden
      className={cn("size-3.5 shrink-0", className)}
      icon={fallbackIcon[kind as keyof typeof fallbackIcon] ?? File01Icon}
      strokeWidth={1.75}
    />
  );
}
