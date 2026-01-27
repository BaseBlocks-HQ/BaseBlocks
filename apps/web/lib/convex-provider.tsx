"use client";

import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { EntityAuthProvider, useAuthFromEntityAuth } from "./entity-auth";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
}

const convex = new ConvexReactClient(convexUrl);

function ConvexProviderWithEntityAuth({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useAuthFromEntityAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <EntityAuthProvider>
      <ConvexProviderWithEntityAuth>{children}</ConvexProviderWithEntityAuth>
    </EntityAuthProvider>
  );
}
