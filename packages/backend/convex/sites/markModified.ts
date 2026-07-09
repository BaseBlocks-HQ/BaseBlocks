import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";

/**
 * Mark a site's content as modified. Called automatically by backend mutations.
 * The frontend derives undeployed status by comparing contentModifiedAt > lastDeployedAt.
 */
export async function markSiteModified(
  ctx: Pick<GenericMutationCtx<DataModel>, "db">,
  siteId: Id<"sites">,
) {
  await ctx.db.patch(siteId, { contentModifiedAt: Date.now() });
}
