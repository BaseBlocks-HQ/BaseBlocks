import type { api } from "@baseblocks/backend";
import type { FunctionReturnType } from "convex/server";

export type ViewerState = FunctionReturnType<
  typeof api.organizations.getViewerState
>;
export type TeamRecord = NonNullable<ViewerState["team"]>;
export type WorkspaceUser = NonNullable<ViewerState["user"]>;
