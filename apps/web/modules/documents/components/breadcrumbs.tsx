"use client";

import { cn } from "@/lib/utils";
import { ChevronRight, FolderOpen } from "lucide-react";

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (folderId: string | null) => void;
  className?: string;
}

export function Breadcrumbs({
  items,
  onNavigate,
  className,
}: BreadcrumbsProps) {
  return (
    <nav
      className={cn(
        "flex items-center space-x-1 text-sm min-w-0 overflow-hidden",
        className,
      )}
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => (
        <div key={item.id ?? "root"} className="flex min-w-0 items-center">
          {index > 0 ? (
            <ChevronRight className="mx-1 h-4 w-4 shrink-0 text-muted-foreground" />
          ) : null}
          {index === items.length - 1 ? (
            <span className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
              {index === 0 ? (
                <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : null}
              <span className="truncate">{item.name}</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate(item.id)}
              className="flex min-w-0 items-center gap-1.5 truncate text-muted-foreground transition-colors hover:text-foreground"
            >
              {index === 0 ? <FolderOpen className="h-4 w-4 shrink-0" /> : null}
              <span className="truncate">{item.name}</span>
            </button>
          )}
        </div>
      ))}
    </nav>
  );
}
