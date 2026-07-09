const SESSION_COOKIE_PREFIX = "bb_access_session_";

export function getAccessSessionCookieName(siteId: string): string {
  return `${SESSION_COOKIE_PREFIX}${siteId}`;
}

export function getStoredAccessSessionTokens(): string[] {
  if (typeof document === "undefined") {
    return [];
  }

  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(SESSION_COOKIE_PREFIX))
    .map((part) => decodeURIComponent(part.slice(part.indexOf("=") + 1).trim()))
    .filter(Boolean);
}

export function getRequestAccessSessionTokens(request: {
  cookies: { getAll(): Array<{ name: string; value: string }> };
}): string[] {
  return request.cookies
    .getAll()
    .filter((cookie) => cookie.name.startsWith(SESSION_COOKIE_PREFIX))
    .map((cookie) => cookie.value.trim())
    .filter(Boolean);
}
