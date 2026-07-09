import { getToken } from "@/app/_auth/server";
import { getTeamDashboardPath } from "@/modules/dashboard/routes";
import { getWorkspaceBoundaryState } from "@/modules/workspace/server";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

export default async function UnauthLayout({ children }: PropsWithChildren) {
  const token = await getToken();
  if (token) {
    const { activeWorkspace } = await getWorkspaceBoundaryState();
    redirect(
      activeWorkspace
        ? getTeamDashboardPath(activeWorkspace.slug)
        : "/onboarding",
    );
  }
  return <>{children}</>;
}
