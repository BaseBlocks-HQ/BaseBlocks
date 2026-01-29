"use client";

import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface UseAuthRedirectOptions {
  /** Path to redirect to if not authenticated */
  loginPath?: string;
  /** Path to redirect to for onboarding */
  onboardingPath?: string;
  /** Condition that triggers onboarding redirect */
  needsOnboarding?: boolean;
}

/**
 * Handles authentication redirects for protected pages
 */
export function useAuthRedirect(options: UseAuthRedirectOptions = {}) {
  const {
    loginPath = "/login",
    onboardingPath = "/onboarding",
    needsOnboarding = false,
  } = options;

  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(loginPath);
    }
  }, [isLoading, isAuthenticated, router, loginPath]);

  // Redirect to onboarding if needed
  useEffect(() => {
    if (!isLoading && isAuthenticated && needsOnboarding) {
      router.push(onboardingPath);
    }
  }, [isLoading, isAuthenticated, needsOnboarding, router, onboardingPath]);

  return {
    isLoading,
    isAuthenticated,
    shouldRender: !isLoading && isAuthenticated && !needsOnboarding,
  };
}
