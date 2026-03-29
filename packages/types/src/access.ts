export const teamRoles = ["admin", "editor", "viewer"] as const;

export type TeamRole = (typeof teamRoles)[number];

export interface TeamCapabilities {
  role: TeamRole;
  canEditContent: boolean;
  canManageLibraries: boolean;
  canManageSites: boolean;
  canManageTeam: boolean;
  canPublish: boolean;
}

export type TeamCapability = Exclude<keyof TeamCapabilities, "role">;

const editorCapabilities = {
  canEditContent: true,
  canManageLibraries: true,
  canManageSites: true,
  canManageTeam: false,
  canPublish: true,
} satisfies Record<TeamCapability, boolean>;

const viewerCapabilities = {
  canEditContent: false,
  canManageLibraries: false,
  canManageSites: false,
  canManageTeam: false,
  canPublish: false,
} satisfies Record<TeamCapability, boolean>;

export function getTeamCapabilities(role: TeamRole): TeamCapabilities {
  if (role === "admin") {
    return {
      role,
      canEditContent: true,
      canManageLibraries: true,
      canManageSites: true,
      canManageTeam: true,
      canPublish: true,
    };
  }

  if (role === "editor") {
    return {
      role,
      ...editorCapabilities,
    };
  }

  return {
    role,
    ...viewerCapabilities,
  };
}

export function hasTeamCapability(
  role: TeamRole,
  capability: TeamCapability,
): boolean {
  return getTeamCapabilities(role)[capability];
}
