const defaultAuthOrigin = "http://localhost:3001";

export function parseAuthOrigin(origin: string, envName = "APP_URL"): string {
  const trimmed = origin.trim();
  if (!trimmed) {
    throw new Error(`${envName} includes an empty origin`);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch (error) {
    throw new Error(`${envName} contains an invalid origin: ${trimmed}`, {
      cause: error,
    });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${envName} origin must use http or https: ${trimmed}`);
  }

  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error(
      `${envName} must contain origins only, without paths or query strings: ${trimmed}`,
    );
  }

  return parsed.origin;
}

// Failure modes:
// - Empty entries in APP_URL silently break trusted origin checks.
// - Paths or query strings in APP_URL create callback mismatches with OAuth providers.
// - Duplicate origins make environment debugging harder without adding any value.
export function parseAuthOrigins(envValue: string | undefined): string[] {
  const rawOrigins = (envValue ?? defaultAuthOrigin)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (rawOrigins.length === 0) {
    throw new Error("APP_URL must include at least one origin");
  }

  const seen = new Set<string>();
  const origins: string[] = [];

  for (const rawOrigin of rawOrigins) {
    const origin = parseAuthOrigin(rawOrigin);
    if (seen.has(origin)) {
      continue;
    }
    seen.add(origin);
    origins.push(origin);
  }

  return origins;
}
