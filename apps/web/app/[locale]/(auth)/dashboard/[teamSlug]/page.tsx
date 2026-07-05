import { getWorkspaceBoundaryContext } from "@/lib/workspace/server";
import { DashboardContent } from "@/modules/dashboard/dashboard-content";
import { DashboardLayout } from "@/modules/dashboard/dashboard-layout";
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

  const initialSites = await client.query(api.sites.queries.listByTeam, {
    teamId: requestedWorkspace._id,
  });

  return (
    <DashboardLayout>
      <DashboardContent initialSites={initialSites} />
    </DashboardLayout>
  );
}
