"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import type { ReactNode } from "react";
import { authClient } from "./auth-client";
import { convex } from "./convex-client";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      {children}
    </ConvexBetterAuthProvider>
  );
}
