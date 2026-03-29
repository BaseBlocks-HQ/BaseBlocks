import { api } from "@baseblocks/backend";
import { getToken } from "@/lib/auth/server";
import { getServerConvexClient } from "@/lib/convex/server";
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
  client: ReturnType<typeof getServerConvexClient>;
  state: WorkspaceBoundaryState;
}> {
  const token = await getToken();
  if (!token) {
    redirect("/login");
  }

  const client = getServerConvexClient(token);
  const state = await client.query(api.teams.queries.getWorkspaceBoundary, {
    ...(teamSlug ? { teamSlug } : {}),
  });

  return { client, state };
}

export async function getWorkspaceBoundaryState(
  teamSlug?: string,
): Promise<WorkspaceBoundaryState> {
  const { state } = await getWorkspaceBoundaryContext(teamSlug);
  return state;
}
