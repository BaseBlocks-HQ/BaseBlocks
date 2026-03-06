"use client";

import { cn } from "@/lib/utils";
import { ChevronRight, Home } from "lucide-react";

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
        "flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground min-w-0 flex-1 overflow-hidden",
        className,
      )}
    >
      <Home className="h-3 w-3 shrink-0" />
      {folderPath.length > 0 && (
        <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
      )}
      <span className="truncate">{currentLocation}</span>
    </button>
  );
}
