export const locales = ["en", "fr"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "fr";
}

export function normalizeLocale(
  input: string | null | undefined,
): Locale | null {
  if (!input) {
    return null;
  }

  const normalized = input.trim().toLowerCase();

  if (normalized === "fr" || normalized.startsWith("fr-")) {
    return "fr";
  }

  if (normalized === "en" || normalized.startsWith("en-")) {
    return "en";
  }

  return null;
}

export function resolveLocale(
  input: string | null | undefined,
  fallback: Locale = defaultLocale,
): Locale {
  return normalizeLocale(input) ?? fallback;
}
