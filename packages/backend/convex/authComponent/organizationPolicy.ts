export const MAX_OWNED_ORGANIZATIONS = 10;

export function parseOrganizationRoles(role: string): string[] {
  return role
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function hasOrganizationRole(role: string, expected: string): boolean {
  return parseOrganizationRoles(role).includes(expected);
}

export function getPrimaryOrganizationRole(
  role: string,
): "owner" | "admin" | "editor" | "viewer" {
  const roles = parseOrganizationRoles(role);
  if (roles.includes("owner")) return "owner";
  if (roles.includes("admin")) return "admin";
  if (roles.includes("editor")) return "editor";
  return "viewer";
}

export function countOwnedOrganizations(
  memberships: ReadonlyArray<{ role: string }>,
): number {
  return memberships.filter((membership) =>
    hasOrganizationRole(membership.role, "owner"),
  ).length;
}

export function hasReachedOwnedOrganizationLimit(
  memberships: ReadonlyArray<{ role: string }>,
  limit = MAX_OWNED_ORGANIZATIONS,
): boolean {
  return countOwnedOrganizations(memberships) >= limit;
}

export type AccountDeletionWorkspace = {
  id: string;
  name: string;
  slug: string | null;
  memberCount: number;
};

export function classifyAccountDeletionWorkspaces(
  ownedWorkspaces: readonly AccountDeletionWorkspace[],
) {
  const workspaces = ownedWorkspaces.map((workspace) => ({
    ...workspace,
    canDeleteWithAccount: workspace.memberCount === 1,
  }));
  const blockedWorkspaces = workspaces.filter(
    (workspace) => !workspace.canDeleteWithAccount,
  );
  return {
    ownedWorkspaces: workspaces,
    deletableWorkspaces: workspaces.filter(
      (workspace) => workspace.canDeleteWithAccount,
    ),
    blockedWorkspaces,
    canDeleteAccount: blockedWorkspaces.length === 0,
  };
}
