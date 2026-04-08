"use client";

import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface FolderPathItem {
  _id: string;
  name: string;
}

interface LibraryBreadcrumbTriggerProps {
  folderPath: FolderPathItem[];
  currentLocation: string;
  className?: string;
}

export function LibraryBreadcrumbTrigger({
  folderPath,
  currentLocation,
  className,
}: LibraryBreadcrumbTriggerProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-w-0 flex-1 items-center gap-1 overflow-hidden rounded-md px-1 py-1 text-left text-[13px] text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      {folderPath.length > 0 && (
        <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
      )}
      <span className="truncate">{currentLocation}</span>
    </button>
  );
}
