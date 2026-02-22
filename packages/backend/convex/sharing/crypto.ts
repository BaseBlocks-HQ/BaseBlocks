/**
 * Cryptographically secure random generation for access codes and session tokens.
 */

const ACCESS_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoiding ambiguous: 0, O, I, 1
const TOKEN_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function secureRandomChars(chars: string, length: number): string {
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(array[i]! % chars.length);
  }
  return result;
}

/** Generate a random 6-character alphanumeric access code */
export function generateAccessCode(): string {
  return secureRandomChars(ACCESS_CODE_CHARS, 6);
}

/** Generate a 32-character session token */
export function generateSessionToken(): string {
  return secureRandomChars(TOKEN_CHARS, 32);
}
