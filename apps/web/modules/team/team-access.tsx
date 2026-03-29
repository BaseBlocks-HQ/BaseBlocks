"use client";

import { authClient } from "@/lib/auth/client";
import type { Id } from "@baseblocks/backend";
import {
  type TeamCapabilities,
  type TeamRole,
  getTeamCapabilities,
} from "@baseblocks/types";
import { type ReactNode, createContext, use, useEffect } from "react";

export type TeamRecord = {
  _id: Id<"teams">;
  joinedAt: number;
  logoUrl?: string;
  memberRole: TeamRole;
  name: string;
  organizationId?: string;
  settings: {
    customDomain?: string;
    primaryColor?: string;
  };
  slug: string;
};

interface TeamAccessValue {
  capabilities: TeamCapabilities;
  role: TeamRole;
  team: TeamRecord;
  teams: TeamRecord[];
}

const TeamAccessContext = createContext<TeamAccessValue | null>(null);

interface TeamAccessProviderProps {
  children: ReactNode;
  workspace: {
    team: TeamRecord;
    teams: TeamRecord[];
  };
}

export function TeamAccessProvider({
  children,
  workspace,
}: TeamAccessProviderProps) {
  const {
    data: session,
    isPending: isSessionPending,
  } = authClient.useSession();
  const activeOrganizationId = session?.session?.activeOrganizationId;
  const { team, teams } = workspace;

  useEffect(() => {
    if (isSessionPending) return;
    if (!session?.session) return;
    if (!team?.organizationId) return;

    if (activeOrganizationId === team.organizationId) return;

    authClient.organization
      .setActive({
        organizationId: team.organizationId,
      })
      .catch(() => null);
  }, [
    activeOrganizationId,
    isSessionPending,
    session?.session,
    team?.organizationId,
  ]);

  const capabilities = getTeamCapabilities(team.memberRole);

  return (
    <TeamAccessContext.Provider
      value={{
        capabilities,
        role: team.memberRole,
        team,
        teams,
      }}
    >
      {children}
    </TeamAccessContext.Provider>
  );
}

export function useTeamAccess() {
  const context = use(TeamAccessContext);
  if (!context) {
    throw new Error("useTeamAccess must be used within a TeamAccessProvider");
  }
  return context;
}
