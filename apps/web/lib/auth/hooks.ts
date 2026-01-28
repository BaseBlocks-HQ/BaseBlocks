"use client";

import { useCallback, useMemo } from "react";
import { entityAuthClient } from "./client";
import { useEntityAuth } from "./context";

const ACCESS_TOKEN_KEY = "entity_auth_access_token";
const REFRESH_TOKEN_KEY = "entity_auth_refresh_token";

/**
 * Hook for Convex authentication integration
 * Returns the format expected by Convex's useAuth
 */
export function useAuthFromEntityAuth() {
  const { isLoading, isAuthenticated, getToken } = useEntityAuth();

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken?: boolean } = {}) => {
      if (forceRefreshToken) {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          try {
            const response = await entityAuthClient.refresh(refreshToken);
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
    [getToken],
  );

  return useMemo(
    () => ({
      isLoading,
      isAuthenticated,
      fetchAccessToken,
    }),
    [isLoading, isAuthenticated, fetchAccessToken],
  );
}
