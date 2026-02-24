export type ElementCategory =
  | "site"
  | "navigation"
  | "layouts"
  | "blocks"
  | "sections"
  | "media"
  | "forms"
  | "customization";

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
    category: "navigation",
    label: "Navigation",
    description: "Site-wide navigation configuration",
    icon: "Navigation",
    order: 1,
  },
  {
    category: "layouts",
    label: "Layouts",
    description: "Container structures for organizing content",
    icon: "Layout",
    order: 2,
  },
  {
    category: "sections",
    label: "Sections",
    description: "Complex pre-built page sections",
    icon: "LayoutTemplate",
    order: 4,
  },
  {
    category: "blocks",
    label: "Blocks",
    description: "Basic content building blocks",
    icon: "Square",
    order: 5,
  },
  {
    category: "media",
    label: "Media",
    description: "Images, videos, and files",
    icon: "Image",
    order: 6,
  },
  {
    category: "forms",
    label: "Forms",
    description: "Form inputs and controls",
    icon: "FormInput",
    order: 7,
  },
  {
    category: "customization",
    label: "Customization",
    description: "Theme colors and styling options",
    icon: "Palette",
    order: 8,
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
