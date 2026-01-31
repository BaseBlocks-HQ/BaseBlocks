"use client";

import { getSortedCategories } from "@/components/elements/registry/categories";
import { cn } from "@/lib/utils";
import type { ElementCategory } from "@/types/elements";
import {
  ChevronRight,
  FormInput,
  Image,
  Layout,
  LayoutTemplate,
  Navigation,
  Settings2,
  Square,
} from "lucide-react";

// Map category to icon
const CATEGORY_ICONS: Record<ElementCategory, React.ReactNode> = {
  site: <Settings2 className="h-5 w-5" />,
  layouts: <Layout className="h-5 w-5" />,
  blocks: <Square className="h-5 w-5" />,
  sections: <LayoutTemplate className="h-5 w-5" />,
  navigation: <Navigation className="h-5 w-5" />,
  media: <Image className="h-5 w-5" />,
  forms: <FormInput className="h-5 w-5" />,
};

interface CategoryMenuItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onMouseEnter: () => void;
  disabled?: boolean;
  isEmpty?: boolean;
}

function CategoryMenuItem({
  icon,
  label,
  isActive,
  onMouseEnter,
  disabled,
  isEmpty,
}: CategoryMenuItemProps) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left",
        isActive && "bg-accent",
        disabled || isEmpty
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-accent cursor-pointer",
      )}
      onMouseEnter={disabled || isEmpty ? undefined : onMouseEnter}
      disabled={disabled || isEmpty}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1">{label}</span>
      {isEmpty && <span className="text-xs text-muted-foreground">Soon</span>}
      {!isEmpty && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </button>
  );
}

interface CategoryMenuProps {
  activeCategory: ElementCategory | null;
  onCategoryHover: (category: ElementCategory) => void;
  selectedSlotId?: string | null;
  emptyCategoryIds?: ElementCategory[];
}

export function CategoryMenu({
  activeCategory,
  onCategoryHover,
  selectedSlotId,
  emptyCategoryIds = [],
}: CategoryMenuProps) {
  const categories = getSortedCategories();

  // Categories that require a slot to be selected
  // "site" and "layouts" do not require a slot
  const slotRequiredCategories: ElementCategory[] = [
    "blocks",
    "sections",
    "media",
    "forms",
  ];

  return (
    <div className="w-full p-2 space-y-1">
      {categories.map((cat) => {
        const requiresSlot = slotRequiredCategories.includes(cat.category);
        const isDisabled = requiresSlot && !selectedSlotId;
        const isEmpty = emptyCategoryIds.includes(cat.category);

        return (
          <CategoryMenuItem
            key={cat.category}
            icon={CATEGORY_ICONS[cat.category]}
            label={cat.label}
            isActive={activeCategory === cat.category}
            onMouseEnter={() => onCategoryHover(cat.category)}
            disabled={isDisabled}
            isEmpty={isEmpty}
          />
        );
      })}
      {!selectedSlotId && (
        <p className="text-xs text-muted-foreground px-3 py-1">
          Select a slot to add blocks
        </p>
      )}
    </div>
  );
}
