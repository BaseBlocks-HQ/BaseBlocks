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

export const getCategoryInfo = getInfo;
export const getSortedCategories = getSorted;
export const categories = CATEGORIES;

export function getCategoryKeys(): ElementCategory[] {
  return CATEGORIES.map((c) => c.category);
}

export function isValidCategory(category: string): category is ElementCategory {
  return CATEGORIES.some((c) => c.category === category);
}

export function getCategoryLabel(category: ElementCategory): string {
  return getCategoryInfo(category)?.label ?? category;
}

export function getCategoryDescription(category: ElementCategory): string {
  return getCategoryInfo(category)?.description ?? "";
}

export function getCategoryIcon(category: ElementCategory): string {
  return getCategoryInfo(category)?.icon ?? "Folder";
}
