"use client";

import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const authRedirectMode = process.env.NEXT_PUBLIC_AUTH_REDIRECT_MODE;

export const authClient = createAuthClient({
  plugins:
    authRedirectMode === "cross-domain"
      ? [organizationClient(), crossDomainClient(), convexClient()]
      : [organizationClient(), convexClient()],
});
