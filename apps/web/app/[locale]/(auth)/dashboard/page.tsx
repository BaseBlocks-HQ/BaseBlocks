import { api } from "@baseblocks/backend";
import { getToken } from "@/lib/auth/server";
import { getServerConvexClient } from "@/lib/convex/server";
import { getTeamDashboardPath } from "@/lib/routes/team-routes";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const token = await getToken();
  if (!token) {
    redirect("/login");
  }

  const client = getServerConvexClient(token);
  const workspace = await client.query(api.teams.queries.getActiveWorkspace, {});

  if (!workspace) {
    redirect("/onboarding");
  }

  redirect(getTeamDashboardPath(workspace.slug));
}
