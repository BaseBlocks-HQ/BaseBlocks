export function getTeamDashboardPath(teamSlug: string): string {
  return `/dashboard/${teamSlug}`;
}

export function getTeamMembersPath(teamSlug: string): string {
  return `${getTeamDashboardPath(teamSlug)}/team`;
}

export function getTeamIntegrationsPath(teamSlug: string): string {
  return `${getTeamDashboardPath(teamSlug)}/integrations`;
}

export function getTeamAnalyticsPath(teamSlug: string): string {
  return `${getTeamDashboardPath(teamSlug)}/analytics`;
}

export function getTeamSiteEditorPath(
  teamSlug: string,
  siteId: string,
): string {
  return `${getTeamDashboardPath(teamSlug)}/sites/${siteId}`;
}
