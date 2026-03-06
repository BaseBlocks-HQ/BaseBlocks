/**
 * Unified slug generation and validation utilities
 * Eliminates 3x duplication across codebase
 */

/**
 * Generate a URL-safe slug from a string
 * @param text - The text to convert to a slug
 * @returns A lowercase, hyphen-separated slug
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Slug validation pattern for HTML input elements
 */
export const SLUG_PATTERN = "[a-z0-9-]+";
