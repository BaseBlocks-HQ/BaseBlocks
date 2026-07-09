"use client";

import { useRouter } from "@/i18n/navigation";
import { getTeamDashboardPath } from "@/modules/dashboard/routes";
import { TeamAccessProvider } from "@/modules/workspace/team-access";
import { api } from "@baseblocks/backend";
import { Spinner } from "@baseblocks/ui/spinner";
import { useQuery } from "convex/react";
import { useEffect, type ReactNode } from "react";
import { DashboardLayout } from "./dashboard-layout";

export function DashboardTeamShell({
  children,
  teamSlug,
}: {
  children: ReactNode;
  teamSlug: string;
}) {
  const router = useRouter();
  const boundary = useQuery(api.teams.getWorkspaceBoundary, { teamSlug });

  useEffect(() => {
    if (!boundary) return;

    if (boundary.teams.length === 0) {
      router.replace("/onboarding");
      return;
    }

    if (!boundary.requestedWorkspace) {
      router.replace(
        boundary.activeWorkspace
          ? getTeamDashboardPath(boundary.activeWorkspace.slug)
          : "/onboarding",
      );
    }
  }, [boundary, router]);

  if (!boundary?.requestedWorkspace) {
    return (
      <div className="flex h-svh items-center justify-center bg-background">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <TeamAccessProvider
      team={boundary.requestedWorkspace}
      teams={boundary.teams}
      user={boundary.user}
    >
      <DashboardLayout>{children}</DashboardLayout>
    </TeamAccessProvider>
  );
}
