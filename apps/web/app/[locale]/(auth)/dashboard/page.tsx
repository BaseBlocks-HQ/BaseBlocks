import { getTeamDashboardPath } from "@/lib/routes/team-routes";
import { getWorkspaceBoundaryState } from "@/lib/workspace/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { activeWorkspace } = await getWorkspaceBoundaryState();

  if (!activeWorkspace) {
    redirect("/onboarding");
  }

  redirect(getTeamDashboardPath(activeWorkspace.slug));
}
