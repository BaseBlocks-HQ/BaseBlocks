"use client";

import { convexClient } from "@convex-dev/better-auth/client/plugins";
import {
  baseBlocksAccessControl,
  baseBlocksRoles,
} from "@baseblocks/backend/auth-permissions";
import type { BetterAuthClientOptions } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const authClientOptions = {
  plugins: [
    organizationClient({
      ac: baseBlocksAccessControl,
      roles: baseBlocksRoles,
    }),
    convexClient(),
  ],
} satisfies BetterAuthClientOptions;

export const authClient = createAuthClient(authClientOptions);
export type AuthClient = typeof authClient;
