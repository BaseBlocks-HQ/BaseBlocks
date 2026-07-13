import { fetchAuthQuery } from "@/lib/auth/server";
import type { TeamRecord } from "@/features/authentication/team-access";
import { api } from "@baseblocks/backend";

interface ViewerState {
  team: TeamRecord | null;
  teams: TeamRecord[];
  user: WorkspaceUser | null;
}

export interface WorkspaceUser {
  email: string | null;
  id: string;
  imageUrl: string | null;
  name: string | null;
}

export async function getViewerState(
  teamSlug?: string,
): Promise<ViewerState> {
  return await fetchAuthQuery(api.organizations.getViewerState, {
    ...(teamSlug ? { teamSlug } : {}),
  });
}
