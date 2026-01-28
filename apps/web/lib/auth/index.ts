/**
 * Authentication module barrel exports
 */

// Types
export type {
  User,
  AuthResponse,
  EntityAuthContextValue,
  SSOStartResponse,
} from "./types";

// Utilities
export { parseJwt, isTokenExpired, extractUserFromToken } from "./utils";

// Client
export { EntityAuthClient, entityAuthClient } from "./client";

// Context and hooks
export { EntityAuthProvider, useEntityAuth } from "./context";
export { useAuthFromEntityAuth } from "./hooks";
