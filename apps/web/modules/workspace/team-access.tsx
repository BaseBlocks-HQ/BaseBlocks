"use client";

import type { WorkspaceUser } from "@/modules/workspace/server";
import type { Id } from "@baseblocks/backend";
import {
  type TeamCapabilities,
  type TeamRole,
  getTeamCapabilities,
} from "@baseblocks/domain";
import { type ReactNode, createContext, use } from "react";

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
  user: WorkspaceUser | null;
}

const TeamAccessContext = createContext<TeamAccessValue | null>(null);

interface TeamAccessProviderProps {
  children: ReactNode;
  team: TeamRecord;
  teams: TeamRecord[];
  user: WorkspaceUser | null;
}

export function TeamAccessProvider({
  children,
  team,
  teams,
  user,
}: TeamAccessProviderProps) {
  const capabilities = getTeamCapabilities(team.memberRole);

  return (
    <TeamAccessContext.Provider
      value={{
        capabilities,
        role: team.memberRole,
        team,
        teams,
        user,
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
