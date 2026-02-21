/**
 * Category registration helpers
 * Provides utilities for working with element categories
 */

import type { ElementCategory } from "@baseblocks/types/elements";
import {
  CATEGORIES,
  getCategoryInfo as getInfo,
  getSortedCategories as getSorted,
} from "@baseblocks/types/elements";

// Re-export category utilities for convenience
export const getCategoryInfo = getInfo;
export const getSortedCategories = getSorted;
export const categories = CATEGORIES;

// Get all category keys
export function getCategoryKeys(): ElementCategory[] {
  return CATEGORIES.map((c) => c.category);
}

// Check if a category exists
export function isValidCategory(category: string): category is ElementCategory {
  return CATEGORIES.some((c) => c.category === category);
}

// Get category label
export function getCategoryLabel(category: ElementCategory): string {
  return getCategoryInfo(category)?.label ?? category;
}

// Get category description
export function getCategoryDescription(category: ElementCategory): string {
  return getCategoryInfo(category)?.description ?? "";
}

// Get category icon name
export function getCategoryIcon(category: ElementCategory): string {
  return getCategoryInfo(category)?.icon ?? "Folder";
}
