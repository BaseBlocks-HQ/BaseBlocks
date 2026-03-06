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
 * Check if a string is a valid slug
 * @param slug - The slug to validate
 * @returns True if the slug is valid
 */
function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length > 0;
}

/**
 * Slug validation pattern for HTML input elements
 */
export const SLUG_PATTERN = "[a-z0-9-]+";
