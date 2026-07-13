"use client";

import type {
  TeamRecord,
  WorkspaceUser,
} from "@/features/authentication/model";
import {
  type OrganizationRole,
  roleHasPermission,
} from "@baseblocks/backend/auth-permissions";
import { type ReactNode, createContext, use } from "react";

interface TeamAccessValue {
  capabilities: {
    canEditContent: boolean;
    canManageLibraries: boolean;
    canManageSites: boolean;
    canManageTeam: boolean;
    canPublish: boolean;
  };
  role: OrganizationRole;
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
  const role = team.memberRole as OrganizationRole;
  const capabilities = {
    canEditContent: roleHasPermission(role, {
      resource: "content",
      action: "edit",
    }),
    canManageLibraries: roleHasPermission(role, {
      resource: "library",
      action: "manage",
    }),
    canManageSites: roleHasPermission(role, {
      resource: "site",
      action: "manage",
    }),
    canManageTeam: roleHasPermission(role, {
      resource: "member",
      action: "update",
    }),
    canPublish: roleHasPermission(role, {
      resource: "publication",
      action: "publish",
    }),
  };

  return (
    <TeamAccessContext.Provider
      value={{
        capabilities,
        role,
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
