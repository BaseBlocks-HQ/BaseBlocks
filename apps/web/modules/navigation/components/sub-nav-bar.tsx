"use client";

import { cn } from "@/lib/utils";
import type { PageWithChildren } from "@baseblocks/types";
import { HorizontalNavItem } from "./horizontal-nav-item";

interface SubNavBarProps {
  pages: PageWithChildren[];
  currentPath?: string;
  className?: string;
}

/**
 * Secondary horizontal navigation bar (tab bar) below the header
 */
export function SubNavBar({ pages, currentPath, className }: SubNavBarProps) {
  return (
    <nav
      className={cn(
        "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className,
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-10 items-center gap-1">
          {pages.map((page) => (
            <HorizontalNavItem
              key={page._id}
              page={page}
              currentPath={currentPath}
              variant="tabbar"
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
