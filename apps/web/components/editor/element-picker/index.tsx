"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CategoryMenu } from "./category-menu";
import { ElementGrid } from "./element-grid";

// Import elements to trigger registration (side effects)
import "@/components/elements/layouts";
import "@/components/elements/blocks";
import "@/components/elements/sections";
import "@/components/elements/media";
import "@/components/elements/forms";

import { getElementsByCategory } from "@/components/elements/registry";
import { CustomizationConfigPanel } from "@/components/elements/customization";
import { NavigationConfigPanel } from "@/components/elements/navigation";
import { SiteConfigPanel } from "@/components/elements/site";
import type { Id } from "@repo/backend";
import type {
  ElementCategory,
  ElementType,
  LayoutType,
} from "@/types/elements";

interface ElementPickerProps {
  siteId?: Id<"sites">;
  selectedSlotId?: string | null;
  onAddLayout?: (type: LayoutType) => void;
  onAddBlock?: (type: ElementType) => void;
}

// Categories with registered elements to show
const ACTIVE_CATEGORIES: ElementCategory[] = [
  "site",
  "navigation",
  "layouts",
  "sections",
  "blocks",
  "media",
  "forms",
  "customization",
];

// Categories that are stubs (empty for now)
const EMPTY_CATEGORIES: ElementCategory[] = [];

// Categories that show config panels instead of element grids
const CONFIG_PANEL_CATEGORIES: ElementCategory[] = ["site", "navigation", "customization"];

export function ElementPicker({
  siteId,
  selectedSlotId,
  onAddLayout,
  onAddBlock,
}: ElementPickerProps) {
  const [activeCategory, setActiveCategory] = useState<ElementCategory | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get elements for the active category
  const categoryElements = useMemo(() => {
    if (!activeCategory) return [];
    return getElementsByCategory(activeCategory);
  }, [activeCategory]);

  // Get category title
  const categoryTitle = useMemo(() => {
    switch (activeCategory) {
      case "site":
        return "Site Settings";
      case "layouts":
        return "Layouts";
      case "blocks":
        return "Blocks";
      case "sections":
        return "Sections";
      case "navigation":
        return "Navigation";
      case "customization":
        return "Customization";
      case "media":
        return "Media";
      case "forms":
        return "Forms";
      default:
        return "";
    }
  }, [activeCategory]);

  const handleMouseEnter = (category: ElementCategory) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setActiveCategory(category);
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    // Don't close if mouse moved to a Radix portal (dropdown menus, selects, etc.)
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (relatedTarget?.closest("[data-radix-popper-content-wrapper]")) {
      return;
    }
    timeoutRef.current = setTimeout(() => {
      setActiveCategory(null);
    }, 150);
  };

  const handleSelect = (type: ElementType | LayoutType) => {
    // Check if it's a layout type
    const layoutTypes = [
      "single",
      "rows",
      "columns",
      "grid",
      "spacer",
      "vertical",
    ];
    if (layoutTypes.includes(type)) {
      onAddLayout?.(type as LayoutType);
    } else {
      onAddBlock?.(type as ElementType);
    }
    // Keep the panel open so users can add multiple blocks
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Check if current category shows a config panel
  const showsConfigPanel =
    activeCategory && CONFIG_PANEL_CATEGORIES.includes(activeCategory);

  return (
    <div
      ref={containerRef}
      className="relative flex"
      onMouseLeave={handleMouseLeave}
    >
      {/* Category menu */}
      <CategoryMenu
        activeCategory={activeCategory}
        onCategoryHover={handleMouseEnter}
        selectedSlotId={selectedSlotId}
        emptyCategoryIds={EMPTY_CATEGORIES}
      />

      {/* Flyout panel with site config */}
      {activeCategory === "site" && siteId && (
        <div
          className="absolute left-full top-0 ml-1 w-80 bg-popover border rounded-lg shadow-lg z-50 max-h-[calc(100vh-200px)] overflow-auto"
          onMouseEnter={() => handleMouseEnter(activeCategory)}
        >
          <SiteConfigPanel siteId={siteId} />
        </div>
      )}

      {/* Flyout panel with navigation config */}
      {activeCategory === "navigation" && siteId && (
        <div
          className="absolute left-full top-0 ml-1 w-80 bg-popover border rounded-lg shadow-lg z-50 max-h-[calc(100vh-200px)] overflow-auto"
          onMouseEnter={() => handleMouseEnter(activeCategory)}
        >
          <NavigationConfigPanel siteId={siteId} />
        </div>
      )}

      {/* Flyout panel with customization config */}
      {activeCategory === "customization" && siteId && (
        <div
          className="absolute left-full top-0 ml-1 w-80 bg-popover border rounded-lg shadow-lg z-50 max-h-[calc(100vh-200px)] overflow-auto"
          onMouseEnter={() => handleMouseEnter(activeCategory)}
        >
          <CustomizationConfigPanel siteId={siteId} />
        </div>
      )}

      {/* Flyout panel with elements */}
      {activeCategory &&
        !showsConfigPanel &&
        categoryElements.length > 0 && (
          <div
            className="absolute left-full top-0 ml-1 w-80 bg-popover border rounded-lg shadow-lg z-50 max-h-[calc(100vh-200px)] overflow-auto"
            onMouseEnter={() => handleMouseEnter(activeCategory)}
          >
            <ElementGrid
              title={categoryTitle}
              entries={categoryElements}
              onSelect={handleSelect}
            />
          </div>
        )}
    </div>
  );
}

// Re-export components
export { CategoryMenu } from "./category-menu";
export { ElementGrid } from "./element-grid";
export { ElementCard } from "./element-card";
