import { ConvexClientProvider } from "@/app/_convex/provider";
import { getTeamDashboardPath } from "@/modules/dashboard/routes";
import { getWorkspaceBoundaryState } from "@/modules/workspace/server";
import { redirect } from "next/navigation";
import { OnboardingPageClient } from "./page-client";

export default async function OnboardingPage() {
  const { activeWorkspace } = await getWorkspaceBoundaryState();

  if (activeWorkspace) {
    redirect(getTeamDashboardPath(activeWorkspace.slug));
  }

  return (
    <ConvexClientProvider>
      <OnboardingPageClient />
    </ConvexClientProvider>
  );
}
