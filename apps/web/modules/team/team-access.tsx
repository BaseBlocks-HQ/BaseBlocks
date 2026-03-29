"use client";

import { authClient } from "@/lib/auth/client";
import { useTeamBySlug, useTeams } from "@/lib/data/use-team";
import type { Id } from "@baseblocks/backend";
import {
  type TeamCapabilities,
  type TeamRole,
  getTeamCapabilities,
} from "@baseblocks/types";
import { useConvexAuth } from "convex/react";
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
  initialTeam?: TeamRecord | null;
  initialTeams?: TeamRecord[];
  teamSlug: string;
}

export function TeamAccessProvider({
  children,
  initialTeam,
  initialTeams,
  teamSlug,
}: TeamAccessProviderProps) {
  const teamQuery = useTeamBySlug(teamSlug);
  const teamsQuery = useTeams();
  const {
    data: session,
    isPending: isSessionPending,
  } = authClient.useSession();
  const { isLoading: isConvexLoading } = useConvexAuth();
  const activeOrganizationId = session?.session?.activeOrganizationId;
  const team = teamQuery === undefined ? initialTeam : teamQuery;
  const teams = teamsQuery === undefined ? (initialTeams ?? []) : teamsQuery;
  const isTeamPending = teamQuery === undefined && initialTeam === undefined;
  const isTeamsPending =
    teamsQuery === undefined && initialTeams === undefined;

  useEffect(() => {
    if (isSessionPending || isConvexLoading) return;
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
    isConvexLoading,
    isSessionPending,
    session?.session,
    team?.organizationId,
  ]);

  if (
    isSessionPending ||
    isConvexLoading ||
    isTeamPending ||
    isTeamsPending
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading workspace...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Workspace not found</p>
      </div>
    );
  }

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
