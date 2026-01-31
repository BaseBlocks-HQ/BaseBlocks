/**
 * Element category definitions
 * Categories group related elements for organization and UI display
 */

// All supported element categories
export type ElementCategory =
  | "site"
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
// Order: Site Settings, Navigation, Layouts, Sections, Blocks, Media, Forms
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
    order: 3,
  },
  {
    category: "blocks",
    label: "Blocks",
    description: "Basic content building blocks",
    icon: "Square",
    order: 4,
  },
  {
    category: "media",
    label: "Media",
    description: "Images, videos, and files",
    icon: "Image",
    order: 5,
  },
  {
    category: "forms",
    label: "Forms",
    description: "Form inputs and controls",
    icon: "FormInput",
    order: 6,
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
