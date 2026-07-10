"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { getTeamDashboardPath } from "@/features/dashboard/routes";
import { TeamAccessProvider } from "@/features/authentication/team-access";
import { api } from "@baseblocks/backend";
import { Spinner } from "@baseblocks/ui/spinner";
import { useQuery } from "convex/react";
import { useEffect, type ReactNode } from "react";
import { DashboardLayout } from "./dashboard-layout";
import { authClient } from "@/lib/auth/client";

export function DashboardTeamShell({
  children,
  teamSlug,
}: {
  children: ReactNode;
  teamSlug: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const boundary = useQuery(api.organizations.getWorkspaceBoundary, {
    teamSlug,
  });
  const siteEditorPathPrefix = `${getTeamDashboardPath(teamSlug)}/sites/`;
  const siteEditorPathSegments = pathname
    .slice(siteEditorPathPrefix.length)
    .split("/")
    .filter(Boolean);
  const isSiteEditorPath =
    pathname.startsWith(siteEditorPathPrefix) &&
    siteEditorPathSegments.length === 1;

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

  useEffect(() => {
    if (!boundary?.requestedWorkspace) return;
    void authClient.organization.setActive({
      organizationId: boundary.requestedWorkspace.organizationId,
    });
  }, [boundary?.requestedWorkspace]);

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
      {isSiteEditorPath ? (
        children
      ) : (
        <DashboardLayout>{children}</DashboardLayout>
      )}
    </TeamAccessProvider>
  );
}
