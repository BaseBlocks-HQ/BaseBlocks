"use client";

import type { TeamRecord } from "@/modules/team/team-access";
import { createContext, use } from "react";

interface AuthenticatedShellValue {
  activeWorkspace: TeamRecord | null;
  teams: TeamRecord[];
}

const AuthenticatedShellContext = createContext<AuthenticatedShellValue | null>(
  null,
);

export function AuthenticatedShellProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: AuthenticatedShellValue;
}) {
  return (
    <AuthenticatedShellContext.Provider value={value}>
      {children}
    </AuthenticatedShellContext.Provider>
  );
}

export function useAuthenticatedShell() {
  const context = use(AuthenticatedShellContext);
  if (!context) {
    throw new Error(
      "useAuthenticatedShell must be used within an AuthenticatedShellProvider",
    );
  }
  return context;
}
