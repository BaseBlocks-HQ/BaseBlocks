import { AuthenticatedShellProvider } from "@/lib/auth-shell/provider";
import { getAuthenticatedShellContext } from "@/lib/auth-shell/server";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";
import { ClientAuthBoundary } from "./client-auth-boundary";

export default async function AuthLayout({ children }: PropsWithChildren) {
  const { token, state } = await getAuthenticatedShellContext();

  if (!token) {
    redirect("/login");
  }

  return (
    <AuthenticatedShellProvider
      value={{
        activeWorkspace: state.activeWorkspace,
        teams: state.teams,
      }}
    >
      <ClientAuthBoundary>{children}</ClientAuthBoundary>
    </AuthenticatedShellProvider>
  );
}
