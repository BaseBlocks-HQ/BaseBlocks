"use client";

import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import type { BetterAuthClientOptions } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const authRedirectMode = process.env.NEXT_PUBLIC_AUTH_REDIRECT_MODE;

const defaultAuthClientOptions = {
  plugins: [organizationClient(), convexClient()],
} satisfies BetterAuthClientOptions;

const crossDomainAuthClientOptions = {
  plugins: [organizationClient(), crossDomainClient(), convexClient()],
} satisfies BetterAuthClientOptions;

type DefaultAuthClient = ReturnType<
  typeof createAuthClient<typeof defaultAuthClientOptions>
>;
type CrossDomainAuthClient = ReturnType<
  typeof createAuthClient<typeof crossDomainAuthClientOptions>
>;

function createConfiguredAuthClient(): DefaultAuthClient | CrossDomainAuthClient {
  if (authRedirectMode === "cross-domain") {
    return createAuthClient(crossDomainAuthClientOptions);
  }

  return createAuthClient(defaultAuthClientOptions);
}

export type AuthClient = ReturnType<typeof createConfiguredAuthClient>;
export const authClient: AuthClient = createConfiguredAuthClient();
