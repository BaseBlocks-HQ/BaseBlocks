export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const SLUG_PATTERN = "[a-z0-9\\-]+";

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
