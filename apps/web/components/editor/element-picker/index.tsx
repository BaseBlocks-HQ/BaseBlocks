"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CategoryMenu } from "./category-menu";
import { ElementGrid } from "./element-grid";

// Import elements to trigger registration (side effects)
import "@/components/elements/layouts";
import "@/components/elements/blocks";
import "@/components/elements/sections";
import "@/components/elements/media";

import { getElementsByCategory } from "@/components/elements/registry";
import type {
  ElementCategory,
  ElementType,
  LayoutType,
} from "@/types/elements";

interface ElementPickerProps {
  selectedSlotId?: string | null;
  onAddLayout?: (type: LayoutType) => void;
  onAddBlock?: (type: ElementType) => void;
}

// Categories with registered elements to show
const ACTIVE_CATEGORIES: ElementCategory[] = [
  "layouts",
  "blocks",
  "sections",
  "media",
];

// Categories that are stubs (empty for now)
const EMPTY_CATEGORIES: ElementCategory[] = ["navigation", "forms"];

export function ElementPicker({
  selectedSlotId,
  onAddLayout,
  onAddBlock,
}: ElementPickerProps) {
  const [activeCategory, setActiveCategory] = useState<ElementCategory | null>(
    null,
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
      case "layouts":
        return "Layouts";
      case "blocks":
        return "Blocks";
      case "sections":
        return "Sections";
      case "media":
        return "Media";
      case "navigation":
        return "Navigation";
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

  const handleMouseLeave = () => {
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
    setActiveCategory(null);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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

      {/* Flyout panel with elements */}
      {activeCategory && categoryElements.length > 0 && (
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
