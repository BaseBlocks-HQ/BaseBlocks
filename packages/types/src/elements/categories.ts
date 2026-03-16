export type ElementCategory =
  | "site"
  | "customization"
  | "navigation"
  | "layouts"
  | "blocks";

export interface CategoryInfo {
  category: ElementCategory;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  order: number; // Display order in UI
}

export const CATEGORIES: CategoryInfo[] = [
  {
    category: "site",
    label: "Site Settings",
    description: "Configure site header and branding",
    icon: "Settings2",
    order: 0,
  },
  {
    category: "customization",
    label: "Customization",
    description: "Theme colors and styling options",
    icon: "Palette",
    order: 1,
  },
  {
    category: "navigation",
    label: "Navigation",
    description: "Site-wide navigation configuration",
    icon: "Navigation",
    order: 2,
  },
  {
    category: "layouts",
    label: "Layouts",
    description: "Container structures for organizing content",
    icon: "Layout",
    order: 3,
  },
  {
    category: "blocks",
    label: "Blocks",
    description: "All content elements, including sections, media, and forms",
    icon: "Square",
    order: 4,
  },
];

export function getCategoryInfo(
  category: ElementCategory,
): CategoryInfo | undefined {
  return CATEGORIES.find((c) => c.category === category);
}

export function getSortedCategories(): CategoryInfo[] {
  return [...CATEGORIES].sort((a, b) => a.order - b.order);
}
