/**
 * Element category definitions
 * Categories group related elements for organization and UI display
 */

// All supported element categories
export type ElementCategory =
  | "layouts"
  | "blocks"
  | "sections"
  | "navigation"
  | "media"
  | "forms";

// Category metadata for UI display
export interface CategoryInfo {
  category: ElementCategory;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  order: number; // Display order in UI
}

// Category definitions with metadata
export const CATEGORIES: CategoryInfo[] = [
  {
    category: "layouts",
    label: "Layouts",
    description: "Container structures for organizing content",
    icon: "Layout",
    order: 0,
  },
  {
    category: "blocks",
    label: "Blocks",
    description: "Basic content building blocks",
    icon: "Square",
    order: 1,
  },
  {
    category: "sections",
    label: "Sections",
    description: "Complex pre-built page sections",
    icon: "LayoutTemplate",
    order: 2,
  },
  {
    category: "navigation",
    label: "Navigation",
    description: "Navigation and menu elements",
    icon: "Navigation",
    order: 3,
  },
  {
    category: "media",
    label: "Media",
    description: "Images, videos, and files",
    icon: "Image",
    order: 4,
  },
  {
    category: "forms",
    label: "Forms",
    description: "Form inputs and controls",
    icon: "FormInput",
    order: 5,
  },
];

// Helper to get category info
export function getCategoryInfo(
  category: ElementCategory,
): CategoryInfo | undefined {
  return CATEGORIES.find((c) => c.category === category);
}

// Helper to get sorted categories
export function getSortedCategories(): CategoryInfo[] {
  return [...CATEGORIES].sort((a, b) => a.order - b.order);
}
