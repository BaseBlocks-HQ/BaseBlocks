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

export function getTeamBillingPath(teamSlug: string): string {
  return `${getTeamDashboardPath(teamSlug)}/billing`;
}

export function getTeamBillingPlansPath(teamSlug: string): string {
  return `${getTeamBillingPath(teamSlug)}/plans`;
}

export function getTeamSettingsPath(teamSlug: string): string {
  return `${getTeamDashboardPath(teamSlug)}/settings`;
}

export function getTeamAccountSettingsPath(teamSlug: string): string {
  return `${getTeamSettingsPath(teamSlug)}/account`;
}

export function getTeamOrganizationsSettingsPath(teamSlug: string): string {
  return `${getTeamSettingsPath(teamSlug)}/organizations`;
}

export function getTeamSiteEditorPath(
  teamSlug: string,
  siteId: string,
): string {
  return `${getTeamDashboardPath(teamSlug)}/sites/${siteId}`;
}
