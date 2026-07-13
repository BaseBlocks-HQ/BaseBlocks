import { getTeamDashboardPath } from "@/features/dashboard/routes";
import { getViewerState } from "@/features/authentication/server";
import { redirect } from "next/navigation";
import { OnboardingPageClient } from "./page-client";

export default async function OnboardingPage() {
  const { team } = await getViewerState();

  if (team) {
    redirect(getTeamDashboardPath(team.slug));
  }

  return <OnboardingPageClient />;
}
