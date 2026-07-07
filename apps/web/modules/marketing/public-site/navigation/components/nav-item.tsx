"use client";

import { getPageLink } from "@/lib/url";
import { usePageExpandState } from "@/modules/marketing/public-site/navigation/hooks/use-page-expand-state";
import { usePublicSiteContextOptional } from "@/modules/marketing/public-site/public-site-context";
import type { PageWithChildren } from "@baseblocks/types";
import { SidebarMenuButton, SidebarMenuItem } from "@baseblocks/ui/sidebar";
import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { IconFile, IconHouse } from "nucleo-glass";
import { useEffect } from "react";

const EMPTY_ANCESTOR_IDS: string[] = [];

interface NavItemProps {
  page: PageWithChildren;
  currentSlug?: string;
  currentPath?: string;
  selectedPageId?: string;
  mode: "editor" | "public" | "preview";
  depth?: number;
  isDefault?: boolean;
  ancestorIds?: string[];
  pagePath?: string;
  onSelect?: (pageId: string) => void;
  defaultExpanded?: boolean;
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
  ancestorIds = EMPTY_ANCESTOR_IDS,
  pagePath,
  onSelect,
  defaultExpanded,
}: NavItemProps) {
  const hasChildren = page.children && page.children.length > 0;
  const indentStep = mode === "public" ? 9 : 12;

  // Build the full path for this page
  const fullPath = pagePath ? `${pagePath}/${page.slug}` : page.slug;

  // Determine if this page is active
  const isActive =
    mode === "public"
      ? currentPath
        ? fullPath === currentPath
        : page.slug === currentSlug
      : page._id === selectedPageId; // works for both "editor" and "preview"

  // Determine if this page should be initially expanded
  // (if it's an ancestor of the current page)
  const shouldAutoExpand = ancestorIds.includes(page._id);

  // Get site context for public mode expand state persistence and page links
  const publicSiteContext = usePublicSiteContextOptional();
  const siteId = publicSiteContext?.siteId ?? "public";
  const siteSlug = publicSiteContext?.siteSlug ?? "";

  // Use persisted expand state (works for both editor and public mode)
  const {
    isExpanded: isExpandedFromStorage,
    toggleExpand,
    setExpanded,
  } = usePageExpandState(siteId);
  const isExpanded = isExpandedFromStorage(page._id);

  // Auto-expand when ancestorIds change (e.g., navigation to a nested page)
  // Also expand pages with children when defaultExpanded is enabled
  useEffect(() => {
    if ((shouldAutoExpand || (defaultExpanded && hasChildren)) && !isExpanded) {
      setExpanded(page._id, true);
    }
  }, [
    shouldAutoExpand,
    defaultExpanded,
    hasChildren,
    isExpanded,
    setExpanded,
    page._id,
  ]);

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
              <IconHouse className="h-4 w-4 text-primary" />
            ) : (
              <IconFile className="h-4 w-4" />
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

  // Preview mode: public visual style, but uses onSelect + selectedPageId like editor
  if (mode === "preview") {
    return (
      <>
        <button
          type="button"
          onClick={() => onSelect?.(page._id)}
          className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors text-left ${
            isActive
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          style={{ paddingLeft: `${(depth + 1) * 12}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              aria-label={isExpanded ? "Collapse section" : "Expand section"}
              onClick={handleToggleExpand}
              className="h-4 w-4 flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <IconFile className="h-4 w-4" />
          <span className="truncate">{page.title}</span>
        </button>
        {hasChildren &&
          isExpanded &&
          page.children.map((child) => (
            <NavItem
              key={child._id}
              page={child}
              selectedPageId={selectedPageId}
              mode="preview"
              depth={depth + 1}
              onSelect={onSelect}
              defaultExpanded={defaultExpanded}
            />
          ))}
      </>
    );
  }

  // Public mode
  return (
    <>
      <Link
        href={getPageLink(siteSlug, fullPath)}
        className={`flex items-center gap-1 px-1 py-1 rounded-md text-sm transition-colors ${
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        style={{ paddingLeft: `${(depth + 1) * indentStep}px` }}
      >
        {/* Expand/collapse toggle - inside the link like in editor */}
        {hasChildren ? (
          <button
            type="button"
            aria-label={isExpanded ? "Collapse section" : "Expand section"}
            onClick={handleToggleExpand}
            className="h-3 w-3 flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <ChevronDown className="h-2.5 w-2.5" />
            ) : (
              <ChevronRight className="h-2.5 w-2.5" />
            )}
          </button>
        ) : (
          <span className="w-3" />
        )}
        <IconFile className="h-4 w-4" />
        {page.title}
      </Link>

      {/* Render children when expanded */}
      {hasChildren &&
        isExpanded &&
        page.children.map((child) => (
          <NavItem
            key={child._id}
            page={child}
            currentSlug={currentSlug}
            currentPath={currentPath}
            mode="public"
            depth={depth + 1}
            ancestorIds={ancestorIds}
            pagePath={fullPath}
            defaultExpanded={defaultExpanded}
          />
        ))}
    </>
  );
}
