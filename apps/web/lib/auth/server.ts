import "server-only";

import { isAuthError } from "@/lib/auth/errors";
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

export const { fetchAuthQuery, getToken, handler } = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
  jwtCache: {
    enabled: true,
    isAuthError,
  },
});
