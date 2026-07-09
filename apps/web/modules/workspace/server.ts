import { fetchAuthQuery } from "@/app/_auth/server";
import type { TeamRecord } from "@/modules/workspace/team-access";
import { api } from "@baseblocks/backend";

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

export async function getWorkspaceBoundaryState(
  teamSlug?: string,
): Promise<WorkspaceBoundaryState> {
  return await fetchAuthQuery(api.teams.getWorkspaceBoundary, {
    ...(teamSlug ? { teamSlug } : {}),
  });
}
