import { getAuthenticatedShellContext } from "@/lib/auth-shell/server";
import { redirect } from "next/navigation";
import type { TeamRecord } from "@/modules/team/team-access";

interface WorkspaceBoundaryState {
  activeWorkspace: TeamRecord | null;
  requestedWorkspace: TeamRecord | null;
  teams: TeamRecord[];
}

export async function getWorkspaceBoundaryContext(
  teamSlug?: string,
): Promise<{
  client: NonNullable<
    Awaited<ReturnType<typeof getAuthenticatedShellContext>>["client"]
  >;
  state: WorkspaceBoundaryState;
}> {
  const { client, token, state } = await getAuthenticatedShellContext(teamSlug);
  if (!token || !client) {
    redirect("/login");
  }

  return { client, state };
}

export async function getWorkspaceBoundaryState(
  teamSlug?: string,
): Promise<WorkspaceBoundaryState> {
  const { state } = await getWorkspaceBoundaryContext(teamSlug);
  return state;
}
