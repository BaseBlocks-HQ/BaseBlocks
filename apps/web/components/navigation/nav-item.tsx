"use client";

import Link from "next/link";
import { FileText, Home } from "lucide-react";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getPageLink } from "@/lib/utils";
import type { PageWithChildren } from "@/types";

interface NavItemProps {
  page: PageWithChildren;
  currentSlug?: string;
  selectedPageId?: string;
  mode: "editor" | "public";
  depth?: number;
  isDefault?: boolean;
  onSelect?: (pageId: string) => void;
}

/**
 * Unified recursive navigation component for editor sidebar and public navigation
 */
export function NavItem({
  page,
  currentSlug,
  selectedPageId,
  mode,
  depth = 0,
  isDefault = false,
  onSelect,
}: NavItemProps) {
  const isActive =
    mode === "public" ? page.slug === currentSlug : page._id === selectedPageId;

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
        href={getPageLink(page.slug)}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        style={{ paddingLeft: `${(depth + 1) * 12}px` }}
      >
        <FileText className="h-4 w-4" />
        {page.title}
      </Link>
      {page.children?.map((child) => (
        <NavItem
          key={child._id}
          page={child}
          currentSlug={currentSlug}
          mode="public"
          depth={depth + 1}
        />
      ))}
    </>
  );
}
