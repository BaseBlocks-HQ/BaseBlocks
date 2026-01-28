"use client";

import { ConvexProviderWithAuth } from "convex/react";
import type { ReactNode } from "react";
import { convex } from "./convex-client";
import { EntityAuthProvider, useAuthFromEntityAuth } from "./auth";

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
