"use client";

import { convexClient } from "@convex-dev/better-auth/client/plugins";
import {
  baseBlocksAccessControl,
  baseBlocksRoles,
} from "@baseblocks/backend/auth-permissions";
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [
    organizationClient({
      ac: baseBlocksAccessControl,
      roles: baseBlocksRoles,
    }),
    convexClient(),
  ],
});
