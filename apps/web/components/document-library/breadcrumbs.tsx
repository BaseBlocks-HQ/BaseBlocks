"use client";

import { cn } from "@/lib/utils";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  id: string | null;
  name: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  libraryName?: string;
  onNavigate: (folderId: string | null) => void;
  className?: string;
}

export function Breadcrumbs({
  items,
  libraryName,
  onNavigate,
  className,
}: BreadcrumbsProps) {
  return (
    <nav
      className={cn("flex items-center space-x-1 text-sm min-w-0 overflow-hidden", className)}
      aria-label="Breadcrumb"
    >
      <button
        type="button"
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
        {libraryName && <span className="hidden sm:inline">{libraryName}</span>}
      </button>

      {items.map((item, index) => (
        <div key={item.id} className="flex items-center">
          <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
          {index === items.length - 1 ? (
            <span className="font-medium text-foreground truncate max-w-[150px]">
              {item.name}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate(item.id)}
              className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[150px]"
            >
              {item.name}
            </button>
          )}
        </div>
      ))}
    </nav>
  );
}
