import { api } from "@baseblocks/backend";
import { getToken } from "@/lib/auth/server";
import { getServerConvexClient } from "@/lib/convex/server";
import type { TeamRecord } from "@/modules/team/team-access";
import { cache } from "react";

interface AuthenticatedShellState {
  activeWorkspace: TeamRecord | null;
  requestedWorkspace: TeamRecord | null;
  teams: TeamRecord[];
}

export const getAuthenticatedShellContext = cache(
  async (
    teamSlug?: string,
  ): Promise<{
    client: ReturnType<typeof getServerConvexClient> | null;
    token: string | null;
    state: AuthenticatedShellState;
  }> => {
    const token = await getToken();
    if (!token) {
      return {
        client: null,
        token: null,
        state: {
          activeWorkspace: null,
          requestedWorkspace: null,
          teams: [],
        },
      };
    }

    const client = getServerConvexClient(token);
    const state = await client.query(api.teams.queries.getWorkspaceBoundary, {
      ...(teamSlug ? { teamSlug } : {}),
    });

    return {
      client,
      token,
      state,
    };
  },
);
