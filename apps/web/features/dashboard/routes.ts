export function getTeamDashboardPath(teamSlug: string): string {
  return `/dashboard/${teamSlug}`;
}

export function getTeamMembersPath(teamSlug: string): string {
  return `${getTeamDashboardPath(teamSlug)}/team`;
}

export function getTeamLibrariesPath(teamSlug: string): string {
  return `${getTeamDashboardPath(teamSlug)}/libraries`;
}

export function getTeamLibraryDetailPath(
  teamSlug: string,
  libraryId: string,
): string {
  return `${getTeamLibrariesPath(teamSlug)}/${libraryId}`;
}

export function getTeamSiteEditorPath(
  teamSlug: string,
  siteId: string,
): string {
  return `${getTeamDashboardPath(teamSlug)}/sites/${siteId}`;
}
