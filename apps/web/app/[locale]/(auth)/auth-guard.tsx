"use client";

import { useRouter } from "@/i18n/navigation";
import { isAuthError } from "@/lib/utils";
import { api } from "@baseblocks/backend";
import { Authenticated, useConvexAuth, useQuery } from "convex/react";
import type { FunctionReference } from "convex/server";
import {
  Component,
  type PropsWithChildren,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

// TODO: [convex-better-auth] queryGeneric from clientApi() isn't visible to
// FilterApi in published 0.10.10. Runtime works (anyApi proxy). Remove cast
// when @convex-dev/better-auth ships the fix upstream.
const getAuthUserFn = (api as Record<string, Record<string, unknown>>).authSetup
  ?.getAuthUser as FunctionReference<"query", "public">;

// Subscribes to the auth user query so that server-side session invalidation
// triggers a re-render (and the error boundary catches the auth error).
function UserSubscription() {
  useQuery(getAuthUserFn);
  return null;
}

// Catches auth errors thrown by Convex queries and redirects to login.
class AuthErrorBoundary extends Component<
  { children: ReactNode; onAuthError: () => void },
  { error?: unknown }
> {
  state: { error?: unknown } = {};
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  componentDidCatch(error: unknown) {
    if (isAuthError(error)) {
      this.props.onAuthError();
    }
  }
  render() {
    if (this.state.error && isAuthError(this.state.error)) {
      return null;
    }
    return this.props.children;
  }
}

/**
 * Minimal auth guard that replaces AuthBoundary to avoid its race condition.
 *
 * AuthBoundary calls `authClient.getSession()` inside handleUnauth, which
 * fires while the OTT exchange is still in progress. That getSession call
 * (without auth headers) races with the OTT exchange's getSession call
 * (with auth headers), causing auth state to bounce and the UI to flash.
 *
 * This guard:
 * - Detects OTT in the URL and waits for the exchange to finish
 * - Redirects to /login only when auth settles as unauthenticated
 * - Catches auth errors from Convex queries via ErrorBoundary
 * - Always renders children (DashboardLayout handles its own skeleton)
 */
export function AuthGuard({ children }: PropsWithChildren) {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();

  // Ref for synchronous checks in effects (avoids first-render race).
  // State for triggering re-renders when OTT exchange completes.
  const ottRef = useRef(false);
  const [ottExchanging, setOttExchanging] = useState(false);

  // Detect OTT and intercept replaceState to know when exchange finishes.
  // ConvexBetterAuthProvider calls replaceState as its final step:
  //   verify(ott) → getSession → updateSession → replaceState
  useEffect(() => {
    if (!new URL(window.location.href).searchParams.has("ott")) return;

    ottRef.current = true;
    setOttExchanging(true);

    const original = window.history.replaceState.bind(window.history);
    window.history.replaceState = (
      data: unknown,
      unused: string,
      url?: string | URL | null,
    ) => {
      original(data, unused, url);
      if (!new URL(window.location.href).searchParams.has("ott")) {
        ottRef.current = false;
        setOttExchanging(false);
        window.history.replaceState = original;
      }
    };

    const timeout = setTimeout(() => {
      ottRef.current = false;
      setOttExchanging(false);
      window.history.replaceState = original;
    }, 5_000);

    return () => {
      clearTimeout(timeout);
      window.history.replaceState = original;
    };
  }, []);

  // Redirect to login when auth settles as unauthenticated.
  // ottRef is checked synchronously so the first effect cycle (which sets
  // ottRef.current = true) prevents this effect from firing prematurely.
  // ottExchanging is in deps to re-evaluate after the exchange completes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: ottExchanging triggers re-evaluation after OTT exchange completes
  useEffect(() => {
    if (ottRef.current) return;
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [ottExchanging, isLoading, isAuthenticated, router]);

  return (
    <AuthErrorBoundary onAuthError={() => router.replace("/login")}>
      <Authenticated>
        <UserSubscription />
      </Authenticated>
      {children}
    </AuthErrorBoundary>
  );
}
