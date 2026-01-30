"use client";

import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { getPageLink } from "@/lib/utils";
import type { PageWithChildren } from "@/types";
import { ChevronDown, ChevronRight, FileText, Home } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface NavItemProps {
  page: PageWithChildren;
  currentSlug?: string;
  currentPath?: string;
  selectedPageId?: string;
  mode: "editor" | "public";
  depth?: number;
  isDefault?: boolean;
  ancestorIds?: string[];
  pagePath?: string;
  onSelect?: (pageId: string) => void;
}

/**
 * Unified recursive navigation component for editor sidebar and public navigation
 */
export function NavItem({
  page,
  currentSlug,
  currentPath,
  selectedPageId,
  mode,
  depth = 0,
  isDefault = false,
  ancestorIds = [],
  pagePath,
  onSelect,
}: NavItemProps) {
  const hasChildren = page.children && page.children.length > 0;

  // Build the full path for this page
  const fullPath = pagePath ? `${pagePath}/${page.slug}` : page.slug;

  // Determine if this page is active
  const isActive =
    mode === "public"
      ? currentPath
        ? fullPath === currentPath
        : page.slug === currentSlug
      : page._id === selectedPageId;

  // Determine if this page should be initially expanded
  // (if it's an ancestor of the current page)
  const shouldAutoExpand = ancestorIds.includes(page._id);

  // Local expand state for public mode
  const [isExpanded, setIsExpanded] = useState(shouldAutoExpand);

  // Auto-expand when ancestorIds change (e.g., navigation to a nested page)
  useEffect(() => {
    if (shouldAutoExpand && !isExpanded) {
      setIsExpanded(true);
    }
  }, [shouldAutoExpand, isExpanded]);

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  if (mode === "editor") {
    return (
      <>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={isActive}
            onClick={() => onSelect?.(page._id)}
            style={{ paddingLeft: `${(depth + 1) * 12}px` }}
          >
            {isDefault ? (
              <Home className="h-4 w-4 text-primary" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            <span className="truncate">{page.title}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {page.children?.map((child) => (
          <NavItem
            key={child._id}
            page={child}
            selectedPageId={selectedPageId}
            mode="editor"
            depth={depth + 1}
            onSelect={onSelect}
          />
        ))}
      </>
    );
  }

  // Public mode
  return (
    <>
      <div className="flex items-center">
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            type="button"
            onClick={handleToggleExpand}
            className="h-6 w-6 flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            style={{ marginLeft: `${depth * 12}px` }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span style={{ marginLeft: `${depth * 12}px`, width: "24px" }} />
        )}

        <Link
          href={getPageLink(fullPath)}
          className={`flex-1 flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors ${
            isActive
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" />
          {page.title}
        </Link>
      </div>

      {/* Render children when expanded */}
      {hasChildren && isExpanded && (
        <>
          {page.children.map((child) => (
            <NavItem
              key={child._id}
              page={child}
              currentSlug={currentSlug}
              currentPath={currentPath}
              mode="public"
              depth={depth + 1}
              ancestorIds={ancestorIds}
              pagePath={fullPath}
            />
          ))}
        </>
      )}
    </>
  );
}
