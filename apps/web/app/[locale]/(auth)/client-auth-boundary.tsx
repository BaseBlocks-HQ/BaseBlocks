"use client";

import { authClient } from "@/lib/auth/client";
import { isAuthError } from "@/lib/utils";
import { api } from "@baseblocks/backend";
import { AuthBoundary } from "@convex-dev/better-auth/react";
import type { FunctionReference } from "convex/server";
import { useRouter } from "next/navigation";
import type { PropsWithChildren } from "react";

// TODO: [convex-better-auth] Remove cast when upstream fixes FilterApi visibility for clientApi queries
const getAuthUserFn = (
  api as Record<string, Record<string, unknown>>
).authSetup?.safeGetAuthUser as FunctionReference<"query", "public">;

export function ClientAuthBoundary({ children }: PropsWithChildren) {
  const router = useRouter();
  return (
    <AuthBoundary
      authClient={authClient}
      onUnauth={() => router.replace("/login")}
      getAuthUserFn={getAuthUserFn}
      isAuthError={isAuthError}
    >
      {children}
    </AuthBoundary>
  );
}
