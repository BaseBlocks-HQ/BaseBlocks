// Failure modes:
// - Invalid origin patterns silently disable uploads for legitimate clients.
// - Overly broad wildcard matching would expose the upload endpoint to
//   unrelated origins.
// - Paths, queries, or hashes in an origin definition are configuration bugs.
export interface AllowedOriginPattern {
  protocol: string;
  hostnamePattern: string;
  port: string;
}

function getNormalizedPort(url: URL): string {
  if (url.port) {
    return url.port;
  }

  return url.protocol === "https:" ? "443" : "80";
}

function assertOriginShape(url: URL, rawValue: string): void {
  if (
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error(`Invalid origin "${rawValue}"`);
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.*]/g, "\\$&");
}

function matchesHostname(hostname: string, hostnamePattern: string): boolean {
  if (!hostnamePattern.includes("*")) {
    return hostname === hostnamePattern;
  }

  const matcher = new RegExp(
    `^${escapeRegex(hostnamePattern).replace(/\\\*/g, "[^.]+")}$`,
  );
  return matcher.test(hostname);
}

function parseAllowedOrigin(rawValue: string): AllowedOriginPattern {
  let url: URL;
  try {
    url = new URL(rawValue);
  } catch {
    throw new Error(`Invalid origin "${rawValue}"`);
  }

  assertOriginShape(url, rawValue);

  return {
    protocol: url.protocol,
    hostnamePattern: url.hostname.toLowerCase(),
    port: getNormalizedPort(url),
  };
}

export function parseAllowedOrigins(
  rawOrigins: string,
): AllowedOriginPattern[] {
  const origins = rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(parseAllowedOrigin);

  if (origins.length === 0) {
    throw new Error(
      "STORAGE_UPLOAD_ALLOWED_ORIGINS must include at least one origin",
    );
  }

  return origins;
}

export function isAllowedOrigin(
  origin: string,
  allowedOrigins: AllowedOriginPattern[],
): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  assertOriginShape(url, origin);
  const hostname = url.hostname.toLowerCase();
  const port = getNormalizedPort(url);

  return allowedOrigins.some((allowedOrigin) => {
    return (
      allowedOrigin.protocol === url.protocol &&
      allowedOrigin.port === port &&
      matchesHostname(hostname, allowedOrigin.hostnamePattern)
    );
  });
}
