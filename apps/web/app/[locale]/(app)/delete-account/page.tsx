import { getToken } from "@/lib/auth/server";
import { getServerConvexClient } from "@/lib/convex/server";
import { AccountDeletionForm } from "@/features/dashboard/settings/account-deletion-form";
import { getViewerState } from "@/features/authentication/server";
import { getTeamDashboardPath } from "@/features/dashboard/routes";
import { api } from "@baseblocks/backend";
import { redirect } from "next/navigation";

export default async function DeleteAccountPage() {
  const token = await getToken();
  if (!token) redirect("/login");

  const convex = getServerConvexClient(token);
  const [plan, { team }] = await Promise.all([
    convex.query(api.organizations.getAccountDeletionPlan),
    getViewerState(),
  ]);
  const cancelHref = team ? getTeamDashboardPath(team.slug) : "/onboarding";
  if (!plan.email || !plan.canDeleteAccount) redirect(cancelHref);

  return (
    <AccountDeletionForm
      email={plan.email}
      cancelHref={cancelHref}
      sharedWorkspaceCount={plan.sharedWorkspaceCount}
      workspaces={plan.deletableWorkspaces}
    />
  );
}
