import { getTeamDashboardPath } from "@/modules/dashboard/routes";
import { getWorkspaceBoundaryState } from "@/modules/workspace/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { activeWorkspace } = await getWorkspaceBoundaryState();

  if (!activeWorkspace) {
    redirect("/onboarding");
  }

  redirect(getTeamDashboardPath(activeWorkspace.slug));
}
