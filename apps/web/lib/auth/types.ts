/**
 * Authentication type definitions
 */

export interface User {
  id: string;
  email?: string;
  username?: string;
  imageUrl?: string;
  organizationId?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  userId: string;
  sessionId?: string;
}

export interface EntityAuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  logout: () => Promise<void>;
  startSSO: (provider: "google" | "microsoft") => Promise<void>;
  getToken: () => Promise<string | null>;
  deleteAccount: () => Promise<{ ok: boolean }>;
}

export interface SSOStartResponse {
  authorizationUrl: string;
  state: string;
}
