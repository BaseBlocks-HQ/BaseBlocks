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
 * HTML `pattern` is compiled with RegExp `v` (unicode sets). Unescaped `-` in
 * `[...]` is special; escape the hyphen so the class is valid.
 */
export const SLUG_PATTERN = "[a-z0-9\\-]+";

/**
 * Pick the first slug `base`, `base-2`, `base-3`, … not present in `used`.
 */
export function uniqueSlugAmong(
  base: string,
  used: ReadonlySet<string>,
): string {
  if (!base) {
    return base;
  }
  const lower = base.toLowerCase();
  const usedLower = new Set([...used].map((s) => s.toLowerCase()));
  let candidate = lower;
  let n = 2;
  while (usedLower.has(candidate)) {
    candidate = `${lower}-${n}`;
    n += 1;
  }
  return candidate;
}
