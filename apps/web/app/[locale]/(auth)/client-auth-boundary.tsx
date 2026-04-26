"use client";

import { authClient } from "@/lib/auth/client";
import { isAuthError } from "@/lib/utils";
import { api } from "@baseblocks/backend";
import { AuthBoundary } from "@convex-dev/better-auth/react";
import { useRouter } from "next/navigation";
import type { PropsWithChildren } from "react";

export function ClientAuthBoundary({ children }: PropsWithChildren) {
  const router = useRouter();
  return (
    <AuthBoundary
      authClient={authClient}
      onUnauth={() => router.replace("/login")}
      getAuthUserFn={api.authSetup.getAuthUser}
      isAuthError={isAuthError}
    >
      {children}
    </AuthBoundary>
  );
}
