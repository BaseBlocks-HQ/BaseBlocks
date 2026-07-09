import { getToken } from "@/modules/auth/server";
import { getServerConvexClient } from "@/modules/convex/server";
import type { TeamRecord } from "@/modules/workspace/team-access";
import { api } from "@baseblocks/backend";
import { redirect } from "next/navigation";
import { cache } from "react";

interface WorkspaceBoundaryState {
  activeWorkspace: TeamRecord | null;
  requestedWorkspace: TeamRecord | null;
  teams: TeamRecord[];
  user: WorkspaceUser | null;
}

export interface WorkspaceUser {
  email: string | null;
  id: string;
  imageUrl: string | null;
  name: string | null;
}

export const getWorkspaceBoundaryContext = cache(
  async (
    teamSlug?: string,
  ): Promise<{
    client: ReturnType<typeof getServerConvexClient>;
    state: WorkspaceBoundaryState;
  }> => {
    const token = await getToken();
    if (!token) {
      redirect("/login");
    }

    const client = getServerConvexClient(token);
    const state = await client.query(api.teams.queries.getWorkspaceBoundary, {
      ...(teamSlug ? { teamSlug } : {}),
    });

    return { client, state };
  },
);

export async function getWorkspaceBoundaryState(
  teamSlug?: string,
): Promise<WorkspaceBoundaryState> {
  const { state } = await getWorkspaceBoundaryContext(teamSlug);
  return state;
}
