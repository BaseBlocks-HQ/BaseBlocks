import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { publicationActionForTarget } from "./releaseState";

export async function promoteRelease(
  ctx: MutationCtx,
  site: Doc<"sites">,
  release: Doc<"siteReleases">,
  actorId: string,
) {
  const currentRelease = site.liveReleaseId
    ? await ctx.db.get(site.liveReleaseId)
    : null;
  const now = Date.now();
  const liveSearchProjectionGeneration =
    (site.liveSearchProjectionGeneration ?? 0) + 1;
  await ctx.db.patch(site._id, {
    liveReleaseId: release._id,
    updatedAt: now,
    liveSearchProjectionGeneration,
  });
  await ctx.db.insert("publicationEvents", {
    siteId: site._id,
    action: publicationActionForTarget(currentRelease?.number, release.number),
    fromReleaseId: site.liveReleaseId,
    toReleaseId: release._id,
    actorId,
    createdAt: now,
  });
  return liveSearchProjectionGeneration;
}
