/**
 * Cryptographically secure random generation for access codes and session tokens.
 */

const ACCESS_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoiding ambiguous: 0, O, I, 1
const TOKEN_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function secureRandomChars(chars: string, length: number): string {
  // Rejection sampling eliminates modulo bias.
  // Values >= threshold are discarded and re-drawn so every char index is
  // equally probable. Expected extra draws < 0.001% for our alphabet sizes.
  const threshold = 0x100000000 - (0x100000000 % chars.length);
  let result = "";
  while (result.length < length) {
    const batch = new Uint32Array(length - result.length);
    crypto.getRandomValues(batch);
    for (const value of batch) {
      if (value < threshold) {
        result += chars.charAt(value % chars.length);
        if (result.length === length) break;
      }
    }
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
