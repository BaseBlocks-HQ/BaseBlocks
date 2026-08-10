import { api } from "@baseblocks/backend";

/**
 * Keep Workspace Foundation calls grouped while their public Convex modules
 * remain available from the generated backend API.
 */
export const workspaceApi = {
  pageGuests: api.pageGuests,
  workspaceProfiles: api.workspaceProfiles,
};
