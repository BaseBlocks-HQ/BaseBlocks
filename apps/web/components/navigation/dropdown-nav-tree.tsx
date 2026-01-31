"use client";

import { getPageLink } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { PageWithChildren } from "@/types";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface DropdownNavTreeProps {
  page: PageWithChildren;
  currentPath?: string;
  pagePath?: string;
}

/**
 * Shared dropdown navigation tree component
 * Used by both TopNavMenu and SubNavBar for consistent dropdown rendering
 */
export function DropdownNavTree({
  page,
  currentPath,
  pagePath,
}: DropdownNavTreeProps) {
  return (
    <DropdownNavItem
      page={page}
      currentPath={currentPath}
      pagePath={pagePath}
      depth={0}
    />
  );
}

interface DropdownNavItemProps {
  page: PageWithChildren;
  currentPath?: string;
  pagePath?: string;
  depth: number;
}

function DropdownNavItem({
  page,
  currentPath,
  pagePath,
  depth,
}: DropdownNavItemProps) {
  const hasChildren = page.children && page.children.length > 0;
  const fullPath = pagePath ? `${pagePath}/${page.slug}` : page.slug;
  const isActive = currentPath === fullPath;
  const isParentOfActive = currentPath?.startsWith(`${fullPath}/`);
  const [isExpanded, setIsExpanded] = useState(isParentOfActive);

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-1 py-1.5 rounded-md text-sm transition-colors",
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px`, paddingRight: "8px" }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={handleToggleExpand}
            className="h-5 w-5 flex items-center justify-center shrink-0 hover:bg-accent rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        <Link
          href={getPageLink(fullPath)}
          className="flex-1 flex items-center gap-2"
        >
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate">{page.title}</span>
        </Link>
      </div>

      {hasChildren && isExpanded && (
        <>
          {page.children.map((child) => (
            <DropdownNavItem
              key={child._id}
              page={child}
              currentPath={currentPath}
              pagePath={fullPath}
              depth={depth + 1}
            />
          ))}
        </>
      )}
    </>
  );
}
