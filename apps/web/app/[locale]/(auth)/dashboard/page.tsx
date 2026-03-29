"use client";

import { DashboardSkeleton } from "@/components/skeletons";
import { authClient } from "@/lib/auth/client";
import { useTeams } from "@/lib/data/use-team";
import { getTeamDashboardPath } from "@/lib/routes/team-routes";
import { useConvexAuth } from "convex/react";
import { redirect } from "next/navigation";

export default function DashboardPage() {
  const teams = useTeams();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { isLoading: isConvexLoading } = useConvexAuth();

  if (isSessionPending || isConvexLoading || teams === undefined) {
    return <DashboardSkeleton />;
  }

  if (teams.length === 0) {
    redirect("/onboarding");
  }

  const activeOrganizationId = session?.session?.activeOrganizationId;
  const activeTeam =
    teams.find((team) => team.organizationId === activeOrganizationId) ??
    teams[0];

  if (activeTeam) {
    redirect(getTeamDashboardPath(activeTeam.slug));
  }

  return <DashboardSkeleton />;
}
