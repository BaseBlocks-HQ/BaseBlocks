"use client";

import { ConvexProviderWithAuth } from "convex/react";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { authClient } from "@/modules/auth/client";
import { convex } from "@/modules/convex/client";

const InitialTokenContext = createContext<string | null>(null);

function useServerTokenAuth() {
  const initialToken = useContext(InitialTokenContext);
  const [token, setToken] = useState(initialToken ?? null);
  const initialTokenRef = useRef(initialToken ?? null);
  const initialTokenUsesRemainingRef = useRef(initialToken ? 2 : 0);
  const tokenRequestRef = useRef<Promise<string | null> | null>(null);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken = false } = {}) => {
      if (initialTokenRef.current && initialTokenUsesRemainingRef.current > 0) {
        const serverToken = initialTokenRef.current;
        initialTokenUsesRemainingRef.current -= 1;
        if (initialTokenUsesRemainingRef.current === 0) {
          initialTokenRef.current = null;
        }
        return serverToken;
      }

      if (token && !forceRefreshToken) {
        return token;
      }

      if (!tokenRequestRef.current) {
        tokenRequestRef.current = authClient.convex
          .token()
          .then(({ data }) => data?.token ?? null)
          .catch(() => null)
          .finally(() => {
            tokenRequestRef.current = null;
          });
      }

      const nextToken = await tokenRequestRef.current;
      setToken(nextToken);
      return nextToken;
    },
    [token],
  );

  return useMemo(
    () => ({
      fetchAccessToken,
      isAuthenticated: token !== null,
      isLoading: false,
    }),
    [fetchAccessToken, token],
  );
}

export function ConvexClientProvider({
  children,
  initialToken,
}: {
  children: ReactNode;
  initialToken?: string | null;
}) {
  return (
    <InitialTokenContext.Provider value={initialToken ?? null}>
      <ConvexProviderWithAuth client={convex} useAuth={useServerTokenAuth}>
        {children}
      </ConvexProviderWithAuth>
    </InitialTokenContext.Provider>
  );
}
