"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const ENTITY_AUTH_URL =
  process.env.NEXT_PUBLIC_ENTITY_AUTH_URL ||
  "https://entityy-entity-auth.vercel.app";
const WORKSPACE_TENANT_ID =
  process.env.NEXT_PUBLIC_ENTITY_AUTH_WORKSPACE_TENANT_ID || "";

const ACCESS_TOKEN_KEY = "entity_auth_access_token";
const REFRESH_TOKEN_KEY = "entity_auth_refresh_token";

interface User {
  id: string;
  email?: string;
  username?: string;
  imageUrl?: string;
  organizationId?: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  userId: string;
  sessionId?: string;
}

interface EntityAuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  logout: () => Promise<void>;
  startSSO: (provider: "google") => Promise<void>;
  getToken: () => Promise<string | null>;
}

const EntityAuthContext = createContext<EntityAuthContextValue | null>(null);

function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    const base64Url = parts[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = parseJwt(token);
  if (!payload || typeof payload.exp !== "number") return true;
  // Consider expired if less than 60 seconds remaining
  return payload.exp * 1000 < Date.now() + 60 * 1000;
}

function extractUserFromToken(token: string): User | null {
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

class EntityAuthClient {
  private baseURL: string;
  private workspaceTenantId: string;

  constructor(baseURL: string, workspaceTenantId: string) {
    this.baseURL = baseURL;
    this.workspaceTenantId = workspaceTenantId;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || error.error || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/refresh", {
      method: "POST",
      headers: {
        "x-refresh-token": refreshToken,
      },
    });
  }

  async logout(accessToken: string): Promise<void> {
    await this.request("/api/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async startSSO(
    provider: "google",
    returnTo?: string
  ): Promise<{ authorizationUrl: string; state: string }> {
    // returnTo is where Entity Auth redirects after OAuth completes
    // Entity Auth handles the OAuth callback internally
    const finalReturnTo = returnTo || `${window.location.origin}/auth/callback`;
    return this.request<{ authorizationUrl: string; state: string }>(
      "/api/auth/sso/start",
      {
        method: "POST",
        body: JSON.stringify({
          provider,
          returnTo: finalReturnTo,
          workspaceTenantId: this.workspaceTenantId,
        }),
      }
    );
  }

  async exchangeTicket(ticket: string): Promise<AuthResponse> {
    // Exchange the __ea_ticket from cross-domain SSO redirect for tokens
    return this.request<AuthResponse>("/api/auth/sso/exchange-ticket", {
      method: "POST",
      body: JSON.stringify({
        ticket,
        workspaceTenantId: this.workspaceTenantId,
      }),
    });
  }
}

const client = new EntityAuthClient(ENTITY_AUTH_URL, WORKSPACE_TENANT_ID);

export function EntityAuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const storeTokens = useCallback(
    (accessToken: string, refreshToken?: string) => {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      setToken(accessToken);
      setUser(extractUserFromToken(accessToken));
    },
    []
  );

  const clearTokens = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;

    try {
      const response = await client.refresh(refreshToken);
      storeTokens(response.accessToken, response.refreshToken);
      return response.accessToken;
    } catch {
      clearTokens();
      return null;
    }
  }, [storeTokens, clearTokens]);

  // Initialize from storage
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);

      if (storedToken) {
        if (!isTokenExpired(storedToken)) {
          setToken(storedToken);
          setUser(extractUserFromToken(storedToken));
        } else {
          // Try to refresh
          await refreshAccessToken();
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, [refreshAccessToken]);

  // Handle SSO callback - Entity Auth redirects here with __ea_ticket
  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const ticket = params.get("__ea_ticket");

      if (ticket) {
        try {
          setIsLoading(true);
          const response = await client.exchangeTicket(ticket);
          storeTokens(response.accessToken, response.refreshToken);

          // Clean up URL
          const url = new URL(window.location.href);
          url.searchParams.delete("__ea_ticket");
          window.history.replaceState({}, "", url.toString());
        } catch (error) {
          console.error("SSO ticket exchange failed:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    handleCallback();
  }, [storeTokens]);

  const logout = useCallback(async () => {
    const currentToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (currentToken) {
      try {
        await client.logout(currentToken);
      } catch {
        // Ignore logout errors
      }
    }
    clearTokens();
  }, [clearTokens]);

  const startSSO = useCallback(async (provider: "google") => {
    const { authorizationUrl, state } = await client.startSSO(provider);
    // Store state for verification
    sessionStorage.setItem("sso_state", state);
    window.location.href = authorizationUrl;
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);

    if (!storedToken) return null;

    if (isTokenExpired(storedToken)) {
      return await refreshAccessToken();
    }

    return storedToken;
  }, [refreshAccessToken]);

  const value = useMemo(
    () => ({
      isLoading,
      isAuthenticated: !!token && !isTokenExpired(token),
      token,
      user,
      logout,
      startSSO,
      getToken,
    }),
    [isLoading, token, user, logout, startSSO, getToken]
  );

  return (
    <EntityAuthContext.Provider value={value}>
      {children}
    </EntityAuthContext.Provider>
  );
}

export function useEntityAuth() {
  const context = useContext(EntityAuthContext);
  if (!context) {
    throw new Error("useEntityAuth must be used within an EntityAuthProvider");
  }
  return context;
}

// Hook for Convex integration
export function useAuthFromEntityAuth() {
  const { isLoading, isAuthenticated, getToken } = useEntityAuth();

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken?: boolean } = {}) => {
      if (forceRefreshToken) {
        // Force refresh by getting a new token
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          try {
            const response = await client.refresh(refreshToken);
            localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
            if (response.refreshToken) {
              localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
            }
            return response.accessToken;
          } catch {
            return null;
          }
        }
        return null;
      }
      return await getToken();
    },
    [getToken]
  );

  return useMemo(
    () => ({
      isLoading,
      isAuthenticated,
      fetchAccessToken,
    }),
    [isLoading, isAuthenticated, fetchAccessToken]
  );
}
