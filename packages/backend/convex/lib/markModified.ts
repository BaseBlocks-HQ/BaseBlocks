import type { Id } from "../_generated/dataModel";

/**
 * Mark a site's content as modified. Called automatically by backend mutations.
 * The frontend derives hasUndeployedChanges by comparing contentModifiedAt > lastDeployedAt.
 */
export async function markSiteModified(
  ctx: { db: any },
  siteId: Id<"sites">,
) {
  await ctx.db.patch(siteId, { contentModifiedAt: Date.now() });
}
