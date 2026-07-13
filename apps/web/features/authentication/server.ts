import { fetchAuthQuery } from "@/lib/auth/server";
import { api } from "@baseblocks/backend";
import type { ViewerState } from "@/features/authentication/model";

export type { WorkspaceUser } from "@/features/authentication/model";

export async function getViewerState(teamSlug?: string): Promise<ViewerState> {
  return await fetchAuthQuery(api.organizations.getViewerState, {
    ...(teamSlug ? { teamSlug } : {}),
  });
}
