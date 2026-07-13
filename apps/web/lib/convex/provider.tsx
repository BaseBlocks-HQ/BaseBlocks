"use client";

import {
  type AuthClient,
  ConvexBetterAuthProvider,
} from "@convex-dev/better-auth/react";
import { ConvexProvider } from "convex/react";
import type { ReactNode } from "react";
import { authClient } from "@/lib/auth/client";
import { convex } from "@/lib/convex/client";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexBetterAuthProvider
      authClient={authClient as unknown as AuthClient}
      client={convex}
    >
      {children}
    </ConvexBetterAuthProvider>
  );
}

export function PublicConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
