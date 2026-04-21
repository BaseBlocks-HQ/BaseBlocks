"use client";

import { cn } from "@/lib/utils";
import { MiddleTruncate } from "@baseblocks/ui/middle-truncate";
import type { ReactNode } from "react";
import { FileIcon, getFileTypeColor } from "./file-icon";

export interface DocumentFileRowData {
  filename: string;
  contentType: string;
  size: number;
  createdAt?: number;
}

interface DocumentFileRowProps<TFile extends DocumentFileRowData> {
  file: TFile;
  onOpen?: (file: TFile) => void;
  actions?: ReactNode;
  className?: string;
  variant?: "list" | "block";
}

export function DocumentFileRow<TFile extends DocumentFileRowData>({
  file,
  onOpen,
  actions,
  className,
  variant = "list",
}: DocumentFileRowProps<TFile>) {
  const isBlock = variant === "block";
  const content = (
    <>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_1px_2px_rgba(15,23,42,0.06)]",
          isBlock ? "h-10 w-10" : "h-9 w-9",
          getFileTypeColor(file.contentType),
        )}
      >
        <FileIcon
          contentType={file.contentType}
          className={isBlock ? "h-5 w-5" : "h-4 w-4"}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="min-w-0 text-sm font-medium leading-5">
          <MiddleTruncate
            text={file.filename}
            className="min-w-0"
            endChars={12}
          />
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
          {formatFileMeta(file)}
        </div>
      </div>
    </>
  );

  return (
    <div
      className={cn(
        isBlock
          ? "group flex w-full min-w-0 items-center gap-2 rounded-lg border bg-card p-2 transition-colors hover:border-primary/30 hover:bg-primary/5"
          : "group flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-muted/50",
        className,
      )}
    >
      {onOpen ? (
        <button
          type="button"
          onClick={() => onOpen(file)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none"
        >
          {content}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>
      )}

      {actions ? (
        <div
          className={cn(
            "flex shrink-0 items-center gap-1",
            !isBlock &&
              "opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
          )}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}

function formatFileMeta(file: Pick<DocumentFileRowData, "size" | "createdAt">) {
  const parts = [formatFileSize(file.size)];

  if (file.createdAt) {
    parts.push(
      new Date(file.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    );
  }

  return parts.join(" • ");
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${Number.parseFloat((bytes / 1024 ** index).toFixed(1))} ${units[index]}`;
}
