import { getWorkspaceBoundaryContext } from "@/modules/workspace/server";
import { DashboardLayout } from "@/modules/dashboard/layout/dashboard-layout";
import { SitesPage } from "@/modules/dashboard/sites/sites-page";
import { api } from "@baseblocks/backend";

interface TeamDashboardPageProps {
  params: Promise<{ teamSlug: string }>;
}

export default async function TeamDashboardPage({
  params,
}: TeamDashboardPageProps) {
  const { teamSlug } = await params;
  const {
    client,
    state: { requestedWorkspace },
  } = await getWorkspaceBoundaryContext(teamSlug);

  if (!requestedWorkspace) {
    return null;
  }

  const initialSites = await client.query(api.sites.listByTeam, {
    teamId: requestedWorkspace._id,
  });

  return (
    <DashboardLayout>
      <SitesPage initialSites={initialSites} />
    </DashboardLayout>
  );
}
