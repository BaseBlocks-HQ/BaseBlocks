/**
 * JWT parsing and token utilities
 */
import type { User } from "./types";

/**
 * Parse a JWT token and extract its payload
 * @param token - The JWT token to parse
 * @returns The decoded payload or null if parsing fails
 */
export function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    const base64Url = parts[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Check if a JWT token is expired
 * @param token - The JWT token to check
 * @param bufferSeconds - Buffer time before actual expiry (default: 60s)
 * @returns True if the token is expired or will expire within the buffer
 */
export function isTokenExpired(token: string, bufferSeconds = 60): boolean {
  const payload = parseJwt(token);
  if (!payload || typeof payload.exp !== "number") return true;
  return payload.exp * 1000 < Date.now() + bufferSeconds * 1000;
}

/**
 * Extract user information from a JWT token
 * @param token - The JWT token to extract user from
 * @returns User object or null if extraction fails
 */
export function extractUserFromToken(token: string): User | null {
  const payload = parseJwt(token);
  if (!payload) return null;
  return {
    id: String(payload.sub || ""),
    email: payload.email as string | undefined,
    username: (payload.username || payload.name) as string | undefined,
    imageUrl: (payload.imageUrl || payload.pictureUrl) as string | undefined,
    organizationId: payload.oid as string | undefined,
  };
}
