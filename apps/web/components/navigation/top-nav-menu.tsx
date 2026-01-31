"use client";

import type { PageWithChildren } from "@/types";
import { cn } from "@/lib/utils";
import { HorizontalNavItem } from "./horizontal-nav-item";

interface TopNavMenuProps {
  pages: PageWithChildren[];
  currentPath?: string;
  className?: string;
}

/**
 * Horizontal navigation menu for header
 */
export function TopNavMenu({ pages, currentPath, className }: TopNavMenuProps) {
  return (
    <nav className={cn("flex items-center gap-1", className)}>
      {pages.map((page) => (
        <HorizontalNavItem
          key={page._id}
          page={page}
          currentPath={currentPath}
          variant="topnav"
        />
      ))}
    </nav>
  );
}
