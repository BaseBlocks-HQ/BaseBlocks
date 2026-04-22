"use client";

import { getElementsByCategory } from "@/modules/elements/framework/registry";
import { themedPickerImagePreview } from "@/modules/elements/framework/themed-picker-image";
import { CustomizationConfigPanel } from "@/modules/elements/panels/customization";
import { NavigationConfigPanel } from "@/modules/elements/panels/navigation";
import { SiteConfigPanel } from "@/modules/elements/panels/site";
import type { Id } from "@baseblocks/backend";
import type {
  ElementCategory,
  ElementType,
  LayoutType,
} from "@baseblocks/types/elements";
import { PanelTop } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EditorFlyoutSurface } from "../editor-flyout-surface";
import { CategoryMenu } from "./category-menu";
import { ElementCard } from "./element-card";
import { ElementGrid } from "./element-grid";

interface ElementPickerProps {
  siteId?: string;
  selectedSlotId?: string | null;
  onAddLayout?: (type: LayoutType) => void;
  onAddBlock?: (type: ElementType) => void;
  onEnableTabs?: () => void;
}

const EMPTY_CATEGORIES: ElementCategory[] = [];

const TabsPreview = themedPickerImagePreview(
  "/editor/picker/layouts/tabs-light.png",
  "/editor/picker/layouts/tabs-dark.png",
);

const CONFIG_PANEL_CATEGORIES: ElementCategory[] = [
  "site",
  "navigation",
  "customization",
];

export function ElementPicker({
  siteId,
  selectedSlotId,
  onAddLayout,
  onAddBlock,
  onEnableTabs,
}: ElementPickerProps) {
  const [activeCategory, setActiveCategory] = useState<ElementCategory | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get elements for the active category (direct registry call)
  const categoryElements = activeCategory
    ? getElementsByCategory(activeCategory)
    : [];

  // Get category title
  const CATEGORY_TITLES: Record<ElementCategory, string> = {
    site: "Site Settings",
    customization: "Customization",
    navigation: "Navigation",
    layouts: "Layouts",
    blocks: "Blocks",
  };
  const categoryTitle = activeCategory
    ? (CATEGORY_TITLES[activeCategory] ?? "")
    : "";

  const handleMouseEnter = (category: ElementCategory) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setActiveCategory(category);
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    // Don't close if mouse moved to a Radix portal (dropdown menus, selects, etc.)
    const relatedTarget = e.relatedTarget;
    if (
      relatedTarget instanceof HTMLElement &&
      (relatedTarget.closest("[data-radix-popper-content-wrapper]") ||
        relatedTarget.closest("[data-slot='dialog-content']") ||
        relatedTarget.closest("[data-slot='dialog-overlay']"))
    ) {
      return;
    }

    // Config panels get a longer timeout since they have interactive controls
    const delay =
      activeCategory && CONFIG_PANEL_CATEGORIES.includes(activeCategory)
        ? 400
        : 150;
    timeoutRef.current = setTimeout(() => {
      setActiveCategory(null);
    }, delay);
  };

  const handleSelect = (type: string) => {
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
        <EditorFlyoutSurface
          className="absolute left-full top-0 z-50 ml-1 max-h-[calc(100vh-200px)] overflow-auto"
          onMouseEnter={() => handleMouseEnter(activeCategory)}
        >
          <SiteConfigPanel siteId={siteId as Id<"sites">} />
        </EditorFlyoutSurface>
      )}

      {/* Flyout panel with navigation config */}
      {activeCategory === "navigation" && siteId && (
        <EditorFlyoutSurface
          className="absolute left-full top-0 z-50 ml-1 max-h-[calc(100vh-200px)] overflow-auto"
          onMouseEnter={() => handleMouseEnter(activeCategory)}
        >
          <NavigationConfigPanel siteId={siteId as Id<"sites">} />
        </EditorFlyoutSurface>
      )}

      {/* Flyout panel with customization config */}
      {activeCategory === "customization" && siteId && (
        <EditorFlyoutSurface
          className="absolute left-full top-0 z-50 ml-1 max-h-[calc(100vh-200px)] overflow-auto"
          onMouseEnter={() => handleMouseEnter(activeCategory)}
        >
          <CustomizationConfigPanel siteId={siteId as Id<"sites">} />
        </EditorFlyoutSurface>
      )}

      {/* Flyout panel with elements */}
      {activeCategory && !showsConfigPanel && categoryElements.length > 0 && (
        <EditorFlyoutSurface
          className="absolute left-full top-0 z-50 ml-1 max-h-[calc(100vh-200px)] overflow-auto"
          onMouseEnter={() => handleMouseEnter(activeCategory)}
        >
          <ElementGrid
            title={categoryTitle}
            entries={categoryElements}
            onSelect={handleSelect}
          />
          {/* Extra Tabs card in layouts flyout */}
          {activeCategory === "layouts" && onEnableTabs && (
            <div className="px-4 pb-4">
              <ElementCard
                label="Tabs"
                icon={PanelTop}
                preview={TabsPreview}
                onClick={onEnableTabs}
              />
            </div>
          )}
        </EditorFlyoutSurface>
      )}
    </div>
  );
}
