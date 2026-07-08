export type ElementCategory =
  | "site"
  | "customization"
  | "navigation"
  | "structure"
  | "blocks";

interface CategoryInfo {
  category: ElementCategory;
  label: string;
  order: number;
}

const CATEGORIES: CategoryInfo[] = [
  { category: "site", label: "Site Settings", order: 0 },
  { category: "customization", label: "Customization", order: 1 },
  { category: "navigation", label: "Navigation", order: 2 },
  { category: "structure", label: "Structure", order: 3 },
  { category: "blocks", label: "Blocks", order: 4 },
];

export function getSortedCategories(): CategoryInfo[] {
  return [...CATEGORIES].sort((a, b) => a.order - b.order);
}
