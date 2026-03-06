import { ConvexError } from "convex/values";

export { cn } from "@baseblocks/ui/lib/utils";

const AUTH_ERROR_PATTERNS = [
  "Unauthenticated",
  "Not authenticated",
  "token expired",
  "invalid token",
  "session not found",
  "UNAUTHORIZED",
] as const;

export const isAuthError = (error: unknown) => {
  const message =
    (error instanceof ConvexError &&
      typeof error.data === "string" &&
      error.data) ||
    (error instanceof Error && error.message) ||
    "";
  return AUTH_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
};
