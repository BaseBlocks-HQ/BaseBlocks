"use client";

import { cn } from "@/lib/utils";
import { ChevronRight, FolderOpen } from "lucide-react";

interface FolderPathItem {
  _id: string;
  name: string;
}

interface LibraryBreadcrumbTriggerProps {
  folderPath: FolderPathItem[];
  currentLocation: string;
  libraryName?: string;
  className?: string;
}

export function LibraryBreadcrumbTrigger({
  folderPath,
  currentLocation,
  libraryName,
  className,
}: LibraryBreadcrumbTriggerProps) {
  const rootLabel = libraryName ?? currentLocation;

  return (
    <button
      type="button"
      className={cn(
        "flex min-w-0 flex-1 items-center gap-1 overflow-hidden rounded-md px-1 py-1 text-left text-[13px] text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      <FolderOpen className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{rootLabel}</span>
      {folderPath.map((folder, index) => (
        <div key={folder._id} className="flex min-w-0 items-center gap-1">
          <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
          <span
            className={cn(
              "truncate",
              index === folderPath.length - 1 && "text-foreground/85",
            )}
          >
            {folder.name}
          </span>
        </div>
      ))}
    </button>
  );
}
