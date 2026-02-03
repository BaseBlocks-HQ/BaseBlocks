"use client";

import { usePublicSiteContextOptional } from "@/components/public/public-site-context";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { usePageExpandState } from "@/hooks/use-page-expand-state";
import { getPageLink } from "@/lib/utils";
import type { PageWithChildren } from "@/types";
import { ChevronDown, ChevronRight, FileText, Home } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

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

  // Get site context for public mode expand state persistence
  const publicSiteContext = usePublicSiteContextOptional();
  const siteId = publicSiteContext?.siteId ?? "public";

  // Use persisted expand state (works for both editor and public mode)
  const { isExpanded: isExpandedFromStorage, toggleExpand, setExpanded } = usePageExpandState(siteId);
  const isExpanded = isExpandedFromStorage(page._id);

  // Auto-expand when ancestorIds change (e.g., navigation to a nested page)
  useEffect(() => {
    if (shouldAutoExpand && !isExpanded) {
      setExpanded(page._id, true);
    }
  }, [shouldAutoExpand, isExpanded, setExpanded, page._id]);

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleExpand(page._id);
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
      <Link
        href={getPageLink(fullPath)}
        className={`flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors ${
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        style={{ paddingLeft: `${(depth + 1) * 12}px` }}
      >
        {/* Expand/collapse toggle - inside the link like in editor */}
        {hasChildren ? (
          <span
            role="button"
            tabIndex={0}
            onClick={handleToggleExpand}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleToggleExpand(e as unknown as React.MouseEvent);
              }
            }}
            className="h-4 w-4 flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </span>
        ) : (
          <span className="w-4" />
        )}
        <FileText className="h-4 w-4" />
        {page.title}
      </Link>

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
