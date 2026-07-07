"use client";

import { getPageLink } from "@/lib/url";
import { cn } from "@/lib/utils";
import { usePublicSiteContext } from "@/modules/public-site/public-site-context";
import type { PageWithChildren } from "@baseblocks/domain";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DropdownNavTree } from "./dropdown-nav-tree";

type HorizontalNavVariant = "topnav" | "tabbar";

interface HorizontalNavItemProps {
  page: PageWithChildren;
  currentPath?: string;
  variant: HorizontalNavVariant;
}

/**
 * Shared horizontal navigation item component
 * Used by both TopNavMenu and SubNavBar for consistent behavior
 */
export function HorizontalNavItem({
  page,
  currentPath,
  variant,
}: HorizontalNavItemProps) {
  const { siteSlug } = usePublicSiteContext();
  const hasChildren = page.children && page.children.length > 0;
  const fullPath = page.slug;
  const isActive = currentPath === fullPath;
  const isParentOfActive = currentPath?.startsWith(`${fullPath}/`);

  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<"left" | "right">(
    "left",
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate dropdown position to avoid overflow
  const updateDropdownPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownWidth = 220;
      const shouldAlignRight =
        rect.left + dropdownWidth > window.innerWidth - 20;
      setDropdownPosition(shouldAlignRight ? "right" : "left");
    }
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    updateDropdownPosition();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Trigger styles based on variant
  const triggerStyles = cn(
    "inline-flex items-center gap-1 text-sm font-medium transition-colors rounded-md",
    "hover:text-foreground",
    isActive || isParentOfActive ? "text-foreground" : "text-muted-foreground",
    // Variant-specific styles
    variant === "topnav" && "px-4 py-2 hover:bg-accent",
    variant === "tabbar" && [
      "px-3 py-2",
      "relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5",
      (isActive || isParentOfActive) && "after:bg-primary",
    ],
  );

  // Simple link for items without children
  if (!hasChildren) {
    return (
      <Link href={getPageLink(siteSlug, fullPath)} className={triggerStyles}>
        {page.title}
      </Link>
    );
  }

  // Item with dropdown for items with children
  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={getPageLink(siteSlug, fullPath)} className={triggerStyles}>
        {page.title}
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </Link>

      {isOpen && (
        <div
          className={cn(
            "absolute top-full pt-1 z-50",
            dropdownPosition === "left" ? "left-0" : "right-0",
          )}
        >
          <div className="w-[220px] rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95">
            <DropdownNavTree page={page} currentPath={currentPath} />
          </div>
        </div>
      )}
    </div>
  );
}
