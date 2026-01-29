"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { entityAuthClient } from "./client";
import type { EntityAuthContextValue, User } from "./types";
import { extractUserFromToken, isTokenExpired } from "./utils";

const ACCESS_TOKEN_KEY = "entity_auth_access_token";
const REFRESH_TOKEN_KEY = "entity_auth_refresh_token";

const EntityAuthContext = createContext<EntityAuthContextValue | null>(null);

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
    [],
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
      const response = await entityAuthClient.refresh(refreshToken);
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
          await refreshAccessToken();
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, [refreshAccessToken]);

  // Handle SSO callback
  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const ticket = params.get("__ea_ticket");

      if (ticket) {
        try {
          setIsLoading(true);
          const response = await entityAuthClient.exchangeTicket(ticket);
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
        await entityAuthClient.logout(currentToken);
      } catch {
        // Ignore logout errors
      }
    }
    clearTokens();
  }, [clearTokens]);

  const startSSO = useCallback(async (provider: "google") => {
    const { authorizationUrl, state } =
      await entityAuthClient.startSSO(provider);
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
    [isLoading, token, user, logout, startSSO, getToken],
  );

  return (
    <EntityAuthContext.Provider value={value}>
      {children}
    </EntityAuthContext.Provider>
  );
}

export function useEntityAuth(): EntityAuthContextValue {
  const context = useContext(EntityAuthContext);
  if (!context) {
    throw new Error("useEntityAuth must be used within an EntityAuthProvider");
  }
  return context;
}
