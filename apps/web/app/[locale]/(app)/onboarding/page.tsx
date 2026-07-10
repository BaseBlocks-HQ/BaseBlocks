import { getTeamDashboardPath } from "@/features/dashboard/routes";
import { getWorkspaceBoundaryState } from "@/features/authentication/server";
import { redirect } from "next/navigation";
import { OnboardingPageClient } from "./page-client";

export default async function OnboardingPage() {
  const { activeWorkspace } = await getWorkspaceBoundaryState();

  if (activeWorkspace) {
    redirect(getTeamDashboardPath(activeWorkspace.slug));
  }

  return <OnboardingPageClient />;
}
